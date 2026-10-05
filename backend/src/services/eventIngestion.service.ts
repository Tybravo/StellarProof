import { scValToNative, StrKey, xdr, type rpc } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { EventIngestionCursorModel } from "../models/EventIngestionCursor.model";
import logger from "../utils/logger";
import type { SorobanService } from "./soroban.service";
import { verificationService } from "./verification.service";
import { mintService } from "./mint.service";
import {
  sorobanEventBus,
  type IngestedSorobanEvent,
  type SorobanEventBus,
} from "./sorobanEventBus.service";

const STREAM = "oracle-provenance-events";

const TOPIC_VERIFICATION_REQUEST = xdr.ScVal.scvSymbol("VerificationRequest").toXDR("base64");
const TOPIC_ATTESTATION = xdr.ScVal.scvSymbol("Attestation").toXDR("base64");
const TOPIC_ATTESTED = xdr.ScVal.scvSymbol("Attested").toXDR("base64");
const TOPIC_CERTIFICATE_MINTED = xdr.ScVal.scvSymbol("CertificateMinted").toXDR("base64");
const TOPIC_REGISTRY = xdr.ScVal.scvSymbol("registry").toXDR("base64");
const TOPIC_TEE_HASH_ADDED = xdr.ScVal.scvSymbol("TeeHashAdded").toXDR("base64");
const TOPIC_TEE_HASH_REMOVED = xdr.ScVal.scvSymbol("TeeHashRemoved").toXDR("base64");
const TOPIC_PROVIDER_ADDED = xdr.ScVal.scvSymbol("ProviderAdded").toXDR("base64");
const TOPIC_PROVIDER_REMOVED = xdr.ScVal.scvSymbol("ProviderRemoved").toXDR("base64");

let defaultSubscriberRegistered = false;

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
  registryContractId: string;
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
      return (
        normalized === "verificationrequest" ||
        normalized === "verification_request" ||
        normalized === "attestation" ||
        normalized === "attested" ||
        normalized === "certificateminted" ||
        normalized === "teehashadded" ||
        normalized === "teehashremoved" ||
        normalized === "provideradded" ||
        normalized === "providerremoved"
      );
    });
}

export class EventIngestionService {
  constructor(
    private readonly rpcClient: Pick<SorobanService, "getEvents">,
    private readonly jobs: EventJobService,
    private readonly cursors: EventCursorStore,
    private readonly config: EventIngestionConfig,
    private readonly minter?: EventMintService,
    private readonly bus: SorobanEventBus = sorobanEventBus
  ) {
    if (
      !StrKey.isValidContract(config.oracleContractId) ||
      !StrKey.isValidContract(config.provenanceContractId) ||
      !StrKey.isValidContract(config.registryContractId)
    ) {
      throw new AppError(
        "Oracle, Provenance, and Registry contract IDs must be valid contract addresses",
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
        {
          type: "contract",
          contractIds: [this.config.oracleContractId],
          // Keep the existing attestation compatibility while adding the
          // VerificationRequest topic required by #684.
          topics: [
            [TOPIC_VERIFICATION_REQUEST],
            [TOPIC_ATTESTATION],
            [TOPIC_ATTESTED],
          ],
        },
        {
          type: "contract",
          contractIds: [this.config.provenanceContractId],
          topics: [[TOPIC_CERTIFICATE_MINTED]],
        },
        {
          type: "contract",
          contractIds: [this.config.registryContractId],
          // Registry events are published as ("registry", EventName, ...).
          // Keep the filter exact so every fetched event is one this decoder
          // understands and can advance past durably.
          topics: [
            [TOPIC_REGISTRY, TOPIC_TEE_HASH_ADDED],
            [TOPIC_REGISTRY, TOPIC_TEE_HASH_REMOVED],
            [TOPIC_REGISTRY, TOPIC_PROVIDER_ADDED],
            [TOPIC_REGISTRY, TOPIC_PROVIDER_REMOVED],
          ],
        },
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

      const decoded = this.decodeEvent(event, name, payload, manifestHash, requestId);
      const handled = await this.bus.publish(decoded);
      correlated += handled;

      if (handled === 0 && decoded.kind !== "registry") {
        logger.warn("Soroban event did not match a verification job", {
          eventId: event.id,
          eventName: name,
          manifestHash,
          requestId,
        });
      }

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

  private decodeEvent(
    event: rpc.Api.EventResponse,
    name: string,
    payload: Record<string, unknown>,
    manifestHash: string | undefined,
    requestId: string | undefined
  ): IngestedSorobanEvent {
    if (name === "verificationrequest" || name === "verification_request") {
      return {
        kind: "verificationRequest",
        eventId: event.id,
        ledger: event.ledger,
        transactionHash: event.txHash,
        requestId:
          field(payload, "request_id", "requestId", "id") ??
          this.topicRequestId(event),
        contentHash:
          field(payload, "content_hash", "contentHash") ??
          this.topicManifestHash(event),
        state: field(payload, "state"),
      };
    }

    if (name === "certificateminted") {
      return {
        kind: "certificateMinted",
        eventId: event.id,
        ledger: event.ledger,
        transactionHash: event.txHash,
        manifestHash,
        requestId,
        certificateId:
          field(payload, "certificate_id", "certificateId") ??
          this.topicCertificateId(event),
      };
    }

    if (
      name === "teehashadded" ||
      name === "teehashremoved" ||
      name === "provideradded" ||
      name === "providerremoved"
    ) {
      return {
        kind: "registry",
        name,
        eventId: event.id,
        ledger: event.ledger,
        transactionHash: event.txHash,
        payload,
      };
    }

    return {
      kind: "attestation",
      eventId: event.id,
      ledger: event.ledger,
      transactionHash: event.txHash,
      manifestHash,
      requestId,
      attestationHash: field(payload, "attestation_hash", "attestationHash"),
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

  if (!defaultSubscriberRegistered) {
    defaultSubscriberRegistered = true;
    sorobanEventBus.subscribe(async (event) => {
      if (event.kind === "registry" || event.kind === "verificationRequest") {
        return false;
      }

      const job =
        event.kind === "certificateMinted"
          ? await verificationService.completeFromMintEvent({
              manifestHash: event.manifestHash,
              requestId: event.requestId,
              certificateId: event.certificateId,
              transactionHash: event.transactionHash,
            })
          : await verificationService.advanceFromAttestationEvent({
              manifestHash: event.manifestHash,
              requestId: event.requestId,
              attestationHash: event.attestationHash,
              transactionHash: event.transactionHash,
            });

      if (!job) return false;
      if (event.kind === "attestation" && job._id) {
        await mintService.mintForJob(String(job._id));
      }
      return true;
    });
  }

  return new EventIngestionService(
    sorobanService,
    verificationService,
    mongooseCursorStore,
    {
      oracleContractId: env.STELLAR_ORACLE_CONTRACT_ID,
      provenanceContractId: env.STELLAR_PROVENANCE_CONTRACT_ID,
      registryContractId: env.STELLAR_REGISTRY_CONTRACT_ID,
      startLedger: env.EVENT_INGESTION_START_LEDGER || undefined,
      limit: env.EVENT_INGESTION_LIMIT,
    },
    mintService
  );
}
