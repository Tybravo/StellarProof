import { scValToNative, StrKey, type rpc } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { EventIngestionCursorModel } from "../models/EventIngestionCursor.model";
import logger from "../utils/logger";
import type { SorobanService } from "./soroban.service";
import { verificationService } from "./verification.service";
import { mintService } from "./mint.service";

const STREAM = "oracle-provenance-events";

interface EventCursorStore {
  get(): Promise<{ cursor: string; latestLedger: number } | null>;
  save(cursor: string, latestLedger: number): Promise<void>;
}

const mongooseCursorStore: EventCursorStore = {
  async get() {
    return EventIngestionCursorModel.findOne({ stream: STREAM })
      .lean<{ cursor: string; latestLedger: number }>();
  },
  async save(cursor, latestLedger) {
    await EventIngestionCursorModel.updateOne(
      { stream: STREAM },
      { $set: { cursor, latestLedger } },
      { upsert: true }
    );
  },
};

interface EventJobService {
  advanceFromAttestationEvent: typeof verificationService.advanceFromAttestationEvent;
  completeFromMintEvent: typeof verificationService.completeFromMintEvent;
}

interface EventMintService {
  mintForJob(jobId: string): Promise<Record<string, unknown>>;
}

export interface EventIngestionConfig {
  oracleContractId: string;
  provenanceContractId: string;
  startLedger?: number;
  limit: number;
}

export interface EventIngestionResult {
  received: number;
  matched: number;
  correlated: number;
  latestLedger: number;
  cursor: string;
}

function record(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value.entries()) as Record<string, unknown>;
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "bigint" || typeof value === "number") return String(value);
  return undefined;
}

function field(payload: Record<string, unknown>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = stringValue(payload[name]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function eventName(event: rpc.Api.EventResponse): string | undefined {
  return event.topic
    .map((topic) => stringValue(scValToNative(topic)))
    .find((topic) => {
      const normalized = topic?.toLowerCase();
      return normalized === "attestation" || normalized === "attested" || normalized === "certificateminted";
    });
}

export class EventIngestionService {
  constructor(
    private readonly rpcClient: Pick<SorobanService, "getEvents">,
    private readonly jobs: EventJobService,
    private readonly cursors: EventCursorStore,
    private readonly config: EventIngestionConfig,
    private readonly minter?: EventMintService
  ) {
    if (!StrKey.isValidContract(config.oracleContractId) || !StrKey.isValidContract(config.provenanceContractId)) {
      throw new AppError(
        "Oracle and Provenance contract IDs must be valid contract addresses",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "EVENT_INGESTION_CONFIG_INVALID"
      );
    }
    if (!Number.isInteger(config.limit) || config.limit < 1 || config.limit > 10_000) {
      throw new AppError("Event ingestion limit is invalid", 500, "EVENT_INGESTION_CONFIG_INVALID");
    }
  }

  async ingestOnce(): Promise<EventIngestionResult> {
    const saved = await this.cursors.get();
    const response = await this.rpcClient.getEvents({
      filters: [
        { type: "contract", contractIds: [this.config.oracleContractId] },
        { type: "contract", contractIds: [this.config.provenanceContractId] },
      ],
      limit: this.config.limit,
      ...(saved?.cursor
        ? { cursor: saved.cursor }
        : this.config.startLedger !== undefined
          ? { startLedger: this.config.startLedger }
          : {}),
    });

    let matched = 0;
    let correlated = 0;
    for (const event of response.events) {
      const name = eventName(event)?.toLowerCase();
      if (!name) continue;
      matched += 1;
      const payload = record(scValToNative(event.value));
      const manifestHash =
        field(payload, "manifest_hash", "manifestHash") ?? this.topicManifestHash(event);
      const requestId =
        field(payload, "request_id", "requestId") ??
        (name === "certificateminted" ? undefined : this.topicRequestId(event));

      const job = name === "certificateminted"
        ? await this.jobs.completeFromMintEvent({
            manifestHash,
            requestId,
            certificateId: field(payload, "certificate_id", "certificateId") ?? this.topicCertificateId(event),
            transactionHash: event.txHash,
          })
        : await this.jobs.advanceFromAttestationEvent({
            manifestHash,
            requestId,
            attestationHash: field(payload, "attestation_hash", "attestationHash"),
            transactionHash: event.txHash,
          });

      if (job) {
        correlated += 1;
        if (name !== "certificateminted" && this.minter && job._id) {
          await this.minter.mintForJob(String(job._id));
        }
      }
      else logger.warn("Soroban event did not match a verification job", {
        eventId: event.id,
        eventName: name,
        manifestHash,
        requestId,
      });

      await this.cursors.save(event.pagingToken, event.ledger);
    }

    if (response.events.length === 0 && response.cursor) {
      await this.cursors.save(response.cursor, response.latestLedger);
    }

    return {
      received: response.events.length,
      matched,
      correlated,
      latestLedger: response.latestLedger,
      cursor: response.cursor,
    };
  }

  private topicCertificateId(event: rpc.Api.EventResponse): string {
    const values = event.topic.map((topic) => scValToNative(topic));
    const certificateId = values.find((value) => typeof value === "bigint" || typeof value === "number");
    if (certificateId === undefined) {
      throw new AppError(
        `CertificateMinted event ${event.id} is missing certificate_id`,
        StatusCodes.BAD_GATEWAY,
        "MALFORMED_CONTRACT_EVENT"
      );
    }
    return String(certificateId);
  }

  private topicManifestHash(event: rpc.Api.EventResponse): string | undefined {
    return event.topic
      .map((topic) => stringValue(scValToNative(topic)))
      .find((value) => value !== undefined && /^[0-9a-fA-F]{64}$/.test(value));
  }

  private topicRequestId(event: rpc.Api.EventResponse): string | undefined {
    return event.topic
      .map((topic) => stringValue(scValToNative(topic)))
      .find((value) => {
        if (!value) return false;
        const normalized = value.toLowerCase();
        return (
          normalized !== "attestation" &&
          normalized !== "attested" &&
          !/^[0-9a-fA-F]{64}$/.test(value) &&
          !StrKey.isValidEd25519PublicKey(value) &&
          !StrKey.isValidContract(value)
        );
      });
  }
}

export function createEventIngestionService(): EventIngestionService {
  const { env } = require("../config/env") as typeof import("../config/env");
  const { sorobanService } = require("./soroban.service") as typeof import("./soroban.service");
  return new EventIngestionService(
    sorobanService,
    verificationService,
    mongooseCursorStore,
    {
      oracleContractId: env.STELLAR_ORACLE_CONTRACT_ID,
      provenanceContractId: env.STELLAR_PROVENANCE_CONTRACT_ID,
      startLedger: env.EVENT_INGESTION_START_LEDGER || undefined,
      limit: env.EVENT_INGESTION_LIMIT,
    },
    mintService
  );
}
