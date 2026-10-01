import crypto from "crypto";
import { nativeToScVal, StrKey, xdr, type rpc } from "@stellar/stellar-sdk";
import { EventIngestionService } from "../services/eventIngestion.service";
import type {
  IngestedSorobanEvent,
  SorobanEventBus,
} from "../services/sorobanEventBus.service";
import { VerificationJobModel } from "../models/verificationJob.model";
import { verificationService } from "../services/verification.service";
import { VerificationStatus } from "../types/verification.types";

const contractId = (): string => StrKey.encodeContract(crypto.randomBytes(32));
const hash = (): string => crypto.randomBytes(32).toString("hex");

function event(
  name: "VerificationRequest" | "attestation" | "CertificateMinted",
  payload: Record<string, unknown>,
  pagingToken: string
): rpc.Api.EventResponse {
  return {
    id: `evt-${pagingToken}`,
    type: "contract",
    ledger: 200,
    ledgerClosedAt: new Date().toISOString(),
    pagingToken,
    inSuccessfulContractCall: true,
    txHash: hash(),
    topic: [xdr.ScVal.scvSymbol(name)],
    value: nativeToScVal(payload),
  };
}

describe("EventIngestionService", () => {
  afterEach(() => jest.restoreAllMocks());

  function harness(events: rpc.Api.EventResponse[]) {
    const rpcClient = {
      getEvents: jest.fn(async () => ({ latestLedger: 205, events, cursor: "page-end" })),
    };
    const jobs = {
      advanceFromAttestationEvent: jest.fn(async () => ({ _id: "job-1" })),
      completeFromMintEvent: jest.fn(async () => ({ _id: "job-1" })),
    };
    const cursors = {
      get: jest.fn(async (): Promise<{ cursor: string; latestLedger: number } | null> => null),
      save: jest.fn(async () => undefined),
    };
    const minter = { mintForJob: jest.fn(async () => ({ certificateId: "1" })) };
    const published: IngestedSorobanEvent[] = [];
    const bus: SorobanEventBus = {
      subscribe: jest.fn(() => () => undefined),
      publish: jest.fn(async (publishedEvent) => {
        published.push(publishedEvent);
        if (
          publishedEvent.kind === "verificationRequest" ||
          publishedEvent.kind === "registry"
        ) {
          return 0;
        }

        const job =
          publishedEvent.kind === "certificateMinted"
            ? await jobs.completeFromMintEvent({
                manifestHash: publishedEvent.manifestHash,
                requestId: publishedEvent.requestId,
                certificateId: publishedEvent.certificateId,
                transactionHash: publishedEvent.transactionHash,
              })
            : await jobs.advanceFromAttestationEvent({
                manifestHash: publishedEvent.manifestHash,
                requestId: publishedEvent.requestId,
                attestationHash: publishedEvent.attestationHash,
                transactionHash: publishedEvent.transactionHash,
              });

        if (!job) return 0;
        if (publishedEvent.kind === "attestation" && job._id) {
          await minter.mintForJob(String(job._id));
        }
        return 1;
      }),
    };
    const oracleContractId = contractId();
    const provenanceContractId = contractId();
    const registryContractId = contractId();
    const service = new EventIngestionService(
      rpcClient,
      jobs as never,
      cursors,
      {
        oracleContractId,
        provenanceContractId,
        registryContractId,
        startLedger: 100,
        limit: 50,
      },
      minter,
      bus
    );
    return {
      service,
      rpcClient,
      jobs,
      cursors,
      minter,
      bus,
      published,
      oracleContractId,
      provenanceContractId,
      registryContractId,
    };
  }

  it("filters contract events and advances a correlated job to minting", async () => {
    const manifestHash = hash();
    const attestationHash = hash();
    const chainEvent = event(
      "attestation",
      { manifest_hash: manifestHash, request_id: "request-7", attestation_hash: attestationHash },
      "200-1"
    );
    const h = harness([chainEvent]);

    await expect(h.service.ingestOnce()).resolves.toMatchObject({ matched: 1, correlated: 1 });
    expect(h.rpcClient.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        startLedger: 100,
        limit: 50,
        filters: [
          {
            type: "contract",
            contractIds: [h.oracleContractId],
            topics: [
              [xdr.ScVal.scvSymbol("VerificationRequest").toXDR("base64")],
              [xdr.ScVal.scvSymbol("Attestation").toXDR("base64")],
              [xdr.ScVal.scvSymbol("Attested").toXDR("base64")],
            ],
          },
          {
            type: "contract",
            contractIds: [h.provenanceContractId],
            topics: [[xdr.ScVal.scvSymbol("CertificateMinted").toXDR("base64")]],
          },
          {
            type: "contract",
            contractIds: [h.registryContractId],
            topics: [
              [
                xdr.ScVal.scvSymbol("registry").toXDR("base64"),
                xdr.ScVal.scvSymbol("TeeHashAdded").toXDR("base64"),
              ],
              [
                xdr.ScVal.scvSymbol("registry").toXDR("base64"),
                xdr.ScVal.scvSymbol("TeeHashRemoved").toXDR("base64"),
              ],
              [
                xdr.ScVal.scvSymbol("registry").toXDR("base64"),
                xdr.ScVal.scvSymbol("ProviderAdded").toXDR("base64"),
              ],
              [
                xdr.ScVal.scvSymbol("registry").toXDR("base64"),
                xdr.ScVal.scvSymbol("ProviderRemoved").toXDR("base64"),
              ],
            ],
          },
        ],
      })
    );
    expect(h.jobs.advanceFromAttestationEvent).toHaveBeenCalledWith({
      manifestHash,
      requestId: "request-7",
      attestationHash,
      transactionHash: chainEvent.txHash,
    });
    expect(h.cursors.save).toHaveBeenCalledWith("200-1", 200);
    expect(h.minter.mintForJob).toHaveBeenCalledWith("job-1");
  });

  it("publishes VerificationRequest without fabricating a job transition", async () => {
    const contentHash = hash();
    const chainEvent = event(
      "VerificationRequest",
      { id: 7n, content_hash: contentHash, state: "Pending" },
      "200-vr"
    );
    const h = harness([chainEvent]);

    await expect(h.service.ingestOnce()).resolves.toMatchObject({
      matched: 1,
      correlated: 0,
    });

    expect(h.published).toEqual([
      expect.objectContaining({
        kind: "verificationRequest",
        eventId: chainEvent.id,
        requestId: "7",
        contentHash,
        state: "Pending",
      }),
    ]);
    expect(h.jobs.advanceFromAttestationEvent).not.toHaveBeenCalled();
    expect(h.jobs.completeFromMintEvent).not.toHaveBeenCalled();
    expect(h.minter.mintForJob).not.toHaveBeenCalled();
    expect(h.cursors.save).toHaveBeenCalledWith("200-vr", 200);
  });

  it("records CertificateMinted results and resumes from the durable cursor", async () => {
    const manifestHash = hash();
    const chainEvent = event("CertificateMinted", {}, "200-2");
    chainEvent.topic.push(
      xdr.ScVal.scvU64(new xdr.Uint64(BigInt(91))),
      xdr.ScVal.scvString(manifestHash)
    );
    chainEvent.value = xdr.ScVal.scvVoid();
    const h = harness([chainEvent]);
    h.cursors.get.mockResolvedValue({ cursor: "199-9", latestLedger: 199 });

    await h.service.ingestOnce();

    expect(h.rpcClient.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: "199-9" })
    );
    expect(h.jobs.completeFromMintEvent).toHaveBeenCalledWith({
      manifestHash,
      requestId: undefined,
      certificateId: "91",
      transactionHash: chainEvent.txHash,
    });
    expect(h.minter.mintForJob).not.toHaveBeenCalled();
  });

  it("advances an empty page cursor without fabricating job data", async () => {
    const h = harness([]);
    await expect(h.service.ingestOnce()).resolves.toMatchObject({ received: 0, matched: 0 });
    expect(h.cursors.save).toHaveBeenCalledWith("page-end", 205);
    expect(h.jobs.advanceFromAttestationEvent).not.toHaveBeenCalled();
  });

  it("persists the attestation event transition idempotently", async () => {
    const job = {
      status: VerificationStatus.TEE_VERIFYING,
      attestationTransactionHash: undefined as string | undefined,
      teeAttestationHash: undefined as string | undefined,
      save: jest.fn(async () => undefined),
      toObject: jest.fn(function (this: unknown) { return this; }),
    };
    jest.spyOn(VerificationJobModel, "findOne").mockResolvedValue(job as never);

    const transactionHash = hash();
    const attestationHash = hash();
    await verificationService.advanceFromAttestationEvent({
      manifestHash: hash(),
      transactionHash,
      attestationHash,
    });

    expect(job.status).toBe(VerificationStatus.MINTING);
    expect(job.attestationTransactionHash).toBe(transactionHash);
    expect(job.teeAttestationHash).toBe(attestationHash);
    expect(job.save).toHaveBeenCalledTimes(1);
  });

  it("persists certificate completion from a correlated mint event", async () => {
    const job = {
      status: VerificationStatus.MINTING,
      stellarTransactionHash: undefined as string | undefined,
      certificateId: undefined as string | undefined,
      save: jest.fn(async () => undefined),
      toObject: jest.fn(function (this: unknown) { return this; }),
    };
    jest.spyOn(VerificationJobModel, "findOne").mockResolvedValue(job as never);

    await verificationService.completeFromMintEvent({
      requestId: "request-9",
      certificateId: "12",
      transactionHash: hash(),
    });

    expect(job.status).toBe(VerificationStatus.COMPLETED);
    expect(job.certificateId).toBe("12");
    expect(job.save).toHaveBeenCalledTimes(1);
  });
});
