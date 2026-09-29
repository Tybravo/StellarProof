/**
 * Verification Worker - manifest re-hash and integrity comparison.
 *
 * Responsibilities:
 * - `verifyManifestForJob`: runs the manifest integrity check for a single
 *   VerificationJob (fetch manifest JSON from IPFS, recompute its
 *   deterministic hash, compare to the on-chain/stored `manifestHash`).
 *   Rejects (marks the job `failed`) on mismatch.
 * - `startManifestRehashWorker`: periodically scans `pending` jobs that have
 *   an associated manifest and runs the check on each, mirroring the
 *   scan-and-update pattern used by `verificationTimeout.job.ts`.
 */
import os from "os";
import crypto from "crypto";
import mongoose from "mongoose";
import { Keypair, scValToNative } from "@stellar/stellar-sdk";
import { connectDatabase, disconnectDatabase } from "../config/database";
import {
  loadOracleConfig,
  loadVerificationWorkerConfig,
  type OracleConfig,
  type VerificationWorkerConfig,
} from "../config/oracle";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import {
  SorobanTransactionError,
  TransactionConfirmationTimeoutError,
  TransactionFailedError,
  TransactionSubmissionError,
} from "../errors/SorobanTransactionError";
import {
  DeadLetterReason,
  DeadLetteredRequestModel,
  PROCESSED_REQUEST_TTL_SECONDS,
  ProcessedRequestModel,
  ProcessedRequestStatus,
  type IProcessedRequest,
} from "../models/verificationJob.model";
import { attestationService, type Attestation, type AttestationInput } from "../services/attestation.service";
import { CidFetchError } from "../services/cidFetch.service";
import { sorobanService, type SorobanService } from "../services/soroban.service";
import {
  SpvFetchError,
  spvVerifierService,
  type SpvVerificationRequest,
  type SpvVerificationResult,
} from "../services/spvVerifier.service";
import { verificationService } from "../services/verification.service";
import { RegistryAuthorizationService } from "../services/registryAuthorization.service";
import { SorobanContractQueryClient } from "../services/contracts/ContractReader";
import { RegistryContract } from "../services/contracts/RegistryContract";
import { OracleContract } from "../services/contracts/OracleContract";
import {
  LeaseLostError,
  verificationRequestEventService,
  type CompletionOutcome,
  type VerificationRequestEventServiceType,
} from "../services/verificationRequestEvent.service";
import logger from "../utils/logger";
import { VerificationStatus, type IVerificationJob } from "../types/verification.types";
import type { IVerificationRequestEvent } from "../types/verificationRequestEvent.types";

/** Upper bound on retry back-off regardless of attempt count. */
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;

const MAX_ATTEMPTS_EXCEEDED = "MAX_ATTEMPTS_EXCEEDED";

type Logger = Pick<typeof logger, "info" | "warn" | "error" | "debug">;

type EventOutcome = "completed" | "rejected" | "duplicate";

/** A request's processed-request ledger entry, as seen by the worker. */
export type RequestLedgerEntry = Omit<IProcessedRequest, "requestId" | "verificationJobId" | "expiresAt"> & {
  verificationJobId?: string;
};

export interface RequestRegistration {
  /** False when the request was already registered (a retry, reclaim or duplicate). */
  created: boolean;
  entry: RequestLedgerEntry;
}

export interface DeadLetterInput {
  requestId: string;
  verificationJobId?: string;
  mediaCid: string;
  manifestCid: string;
  requester: string;
  attempts: number;
  reason: DeadLetterReason;
  errorMessage: string;
  errorCode?: string;
}

/** Per-request deduplication ledger and dead-letter sink. */
export interface RequestLedger {
  /** Registers `requestId`; returns the existing entry if it is already registered. */
  register(requestId: string): Promise<RequestRegistration>;
  attachJob(requestId: string, jobId: string): Promise<void>;
  recordSpvVerdict(requestId: string, result: SpvVerificationResult): Promise<void>;
  markCompleted(requestId: string, outcome: CompletionOutcome): Promise<void>;
  /** Never overrides a completed entry. */
  markFailed(requestId: string, reason: string): Promise<void>;
  /** Idempotent: a request is dead-lettered at most once. */
  deadLetter(input: DeadLetterInput): Promise<void>;
}

export interface VerificationWorkerDeps {
  events: Pick<
    VerificationRequestEventServiceType,
    | "claimNext"
    | "attachJob"
    | "recordVerification"
    | "recordTransaction"
    | "markCompleted"
    | "markFailed"
    | "scheduleRetry"
  >;
  jobs: Pick<typeof verificationService, "createJob" | "getJob" | "updateJobStatus">;
  ledger: RequestLedger;
  verifier: { verify(request: SpvVerificationRequest): Promise<SpvVerificationResult> };
  attestations: {
    createAttestation(input: AttestationInput, keypair: Keypair, codeMeasurementHash: string): Attestation;
  };
  authorization?: Pick<RegistryAuthorizationService, "assertAuthorized">;
  soroban: Pick<
    SorobanService,
    "buildMintTransaction" | "submitTransaction" | "getTransactionWithConfirmation"
  >;
  oracle: OracleConfig;
  config: VerificationWorkerConfig;
  logger: Logger;
  workerId?: string;
  now?: () => Date;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Runs the manifest integrity check for a single job. Fetches the
 * manifest's stored JSON from IPFS, recomputes its deterministic hash, and
 * compares it to the manifest's recorded `manifestHash`. On mismatch, the
 * job is transitioned to `failed`.
 */
export async function verifyManifestForJob(
  jobId: string
): Promise<IVerificationJob> {
  return verificationService.verifyManifestIntegrity(jobId);
}

/**
 * Starts a scheduled scan of `pending` verification jobs that have an
 * associated manifest, running the manifest re-hash check on each.
 */
export function startManifestRehashWorker(): void {
  // Run every minute, alongside the existing timeout job.
  cron.schedule("* * * * *", async () => {
    try {
      this.deps.logger.info("Verification worker: processing event", ctx);
      const outcome = await this.advance(event, (id) => {
        jobId = id;
      });
      this.deps.logger.info("Verification worker: event finished", { ...ctx, jobId, outcome });
    } catch (err) {
      await this.handleFailure(event, jobId, err);
    }
  }

  /** Drives the event's job from its current state to a terminal state. */
  private async advance(
    event: IVerificationRequestEvent,
    onJob: (jobId: string) => void
  ): Promise<EventOutcome> {
    const { events, jobs, ledger } = this.deps;
    const requestId = event.eventId;

    // Deduplication guard: runs before any work, including on every retry.
    const { created, entry } = await ledger.register(requestId);
    if (isSettled(entry)) {
      return this.settleDuplicate(event, entry);
    }
    if (!created) {
      this.deps.logger.info("Verification worker: resuming registered request", {
        workerId: this.workerId,
        eventId: requestId,
        attempt: event.attempts,
      });
    }

    if (event.attempts > this.deps.config.maxAttempts) {
      throw new AppError(
        `Exceeded ${this.deps.config.maxAttempts} processing attempts`,
        500,
        MAX_ATTEMPTS_EXCEEDED
      );
    }

    const knownJobId = event.verificationJobId ?? entry.verificationJobId;
    let job: IVerificationJob | null = knownJobId ? await jobs.getJob(knownJobId) : null;
    if (job) {
      const id = String(job._id);
      onJob(id);
      if (!entry.verificationJobId) await ledger.attachJob(requestId, id);
      if (!event.verificationJobId) await events.attachJob(event._id, this.workerId, id);
    }

    if (job && isTerminal(job.status)) {
      return this.settleFromTerminalJob(event, job);
    }

    let manifestHash = event.manifestHash;

    // Stage 1: verification (fresh event, or crash before attestation).
    if (!job || job.status === VerificationStatus.PENDING || job.status === VerificationStatus.PROCESSING) {
      const result = await this.verifyOnce(event, entry);

      if (!job) {
        job = await jobs.createJob({
          ownerPublicKey: event.requester,
          contentHash: result.contentHash,
          manifestHash: result.manifestHash,
          requestId: event.eventId,
        });
        await events.attachJob(event._id, this.workerId, String(job._id));
      }
      const id = String(job._id);
      onJob(id);
      await events.recordVerification(event._id, this.workerId, {
        contentHash: result.contentHash,
        manifestHash: result.manifestHash,
      });
      manifestHash = result.manifestHash;

      if (job.status === VerificationStatus.PENDING) {
        job = await jobs.updateJobStatus(id, { status: VerificationStatus.PROCESSING });
      }

      if (!result.verified) {
        const reason = `SPV verification failed: ${result.reason ?? "unknown reason"}`;
        await jobs.updateJobStatus(id, { status: VerificationStatus.FAILED, errorMessage: reason });
        await ledger.markFailed(requestId, reason);
        await events.markFailed(event._id, this.workerId, reason);
        this.deps.logger.warn("Verification worker: verification rejected", {
          workerId: this.workerId,
          eventId: event.eventId,
          jobId: id,
          reason,
        });
        return "rejected";
      }

      const attestation = this.deps.attestations.createAttestation(
        {
          eventId: event.eventId,
          requester: event.requester,
          mediaCid: event.mediaCid,
          manifestCid: event.manifestCid,
          contentHash: result.contentHash,
          manifestHash: result.manifestHash,
        },
        this.deps.oracle.keypair,
        this.deps.oracle.codeMeasurementHash
      );

      job = await jobs.updateJobStatus(id, {
        status: VerificationStatus.TEE_VERIFYING,
        teeAttestationHash: attestation.attestationHash,
        teeSignature: attestation.signature,
        codeMeasurementHash: attestation.codeMeasurementHash,
      });
    }

    const id = String(job._id);
    onJob(id);

    // Stage 2: attestation transaction.
    if (job.status === VerificationStatus.TEE_VERIFYING) {
      if (!job.codeMeasurementHash) {
        throw new AppError(
          "Cannot submit attestation without a TEE measurement hash",
          409,
          "MISSING_TEE_MEASUREMENT"
        );
      }
      await this.deps.authorization?.assertAuthorized(
        job.codeMeasurementHash,
        this.deps.oracle.keypair.publicKey()
      );
      const txHash = await this.submitAttestation(event, job, manifestHash);
      job = await jobs.updateJobStatus(id, {
        status: VerificationStatus.MINTING,
        stellarTransactionHash: txHash,
      });
    }

    // Stage 3: finality. The job completes only after on-chain SUCCESS.
    if (job.status !== VerificationStatus.MINTING || !job.stellarTransactionHash) {
      throw new AppError(`Job ${id} is in unexpected state '${job.status}'`, 409, "UNEXPECTED_JOB_STATE");
    }

    const confirmed = await this.deps.soroban.getTransactionWithConfirmation(job.stellarTransactionHash);
    const certificateId =
      confirmed.returnValue !== undefined ? String(scValToNative(confirmed.returnValue)) : undefined;

    const completion: CompletionOutcome = {
      transactionHash: confirmed.txHash,
      ...(certificateId !== undefined ? { certificateId } : {}),
    };
    await jobs.updateJobStatus(id, { status: VerificationStatus.COMPLETED });
    await ledger.markCompleted(requestId, completion);
    await events.markCompleted(event._id, this.workerId, completion);
    this.deps.logger.info("Verification worker: certificate minted", {
      workerId: this.workerId,
      eventId: event.eventId,
      jobId: id,
      txHash: confirmed.txHash,
      ledger: confirmed.ledger,
      certificateId,
    });
    return "completed";
  }

  /**
   * Submits the mint transaction for a job in `tee_verifying` and returns
   * its hash once the RPC accepts it. If a previous attempt already submitted
   * a transaction, that transaction's outcome is resolved first so a
   * certificate is never minted twice.
   */
  private async submitAttestation(
    event: IVerificationRequestEvent,
    job: IVerificationJob,
    manifestHash: string | undefined
  ): Promise<string> {
    const { events, soroban, oracle } = this.deps;

    if (event.transactionHash) {
      try {
        await soroban.getTransactionWithConfirmation(event.transactionHash);
        return event.transactionHash;
      } catch (err) {
        if (!transactionDidNotLand(err)) throw err;
        this.deps.logger.warn("Verification worker: previous mint transaction did not land, rebuilding", {
          workerId: this.workerId,
          eventId: event.eventId,
          txHash: event.transactionHash,
          error: describeError(err),
        });
        await events.recordTransaction(event._id, this.workerId, null);
      }
    }

    if (!manifestHash || !job.teeAttestationHash) {
      throw new AppError(
        "Cannot build mint transaction: manifest hash or attestation hash missing",
        409,
        "MISSING_ATTESTATION_DATA"
      );
    }

    const signed = await soroban.buildMintTransaction(oracle.keypair, oracle.provenanceContractId, {
      to: event.requester,
      mediaCid: event.mediaCid,
      manifestHash,
      attestationHash: job.teeAttestationHash,
    });

    // Persist the hash before sending so a crash mid-submit can be resolved.
    await events.recordTransaction(event._id, this.workerId, signed.hash);
    try {
      await soroban.submitTransaction(signed);
    } catch (err) {
      if (err instanceof TransactionFailedError || err instanceof TransactionSubmissionError) {
        // Rejected before reaching a ledger: this hash can never land.
        await events.recordTransaction(event._id, this.workerId, null);
      }
      throw err;
    }

    this.deps.logger.info("Verification worker: mint transaction submitted", {
      workerId: this.workerId,
      eventId: event.eventId,
      jobId: String(job._id),
      txHash: signed.hash,
    });
    return signed.hash;
  }

  /**
   * Runs SPV verification at most once per request. The verdict is
   * checkpointed before it is acted on, so a retry reuses it instead of
   * fetching and verifying the content again.
   */
  private async verifyOnce(
    event: IVerificationRequestEvent,
    entry: RequestLedgerEntry
  ): Promise<SpvVerificationResult> {
    if (entry.spvVerified !== undefined && entry.contentHash && entry.manifestHash) {
      this.deps.logger.debug("Verification worker: reusing checkpointed SPV verdict", {
        workerId: this.workerId,
        eventId: event.eventId,
      });
      return {
        verified: entry.spvVerified,
        contentHash: entry.contentHash,
        manifestHash: entry.manifestHash,
        ...(entry.spvFailureReason !== undefined ? { reason: entry.spvFailureReason } : {}),
      };
    }

    const result = await this.deps.verifier.verify({
      mediaCid: event.mediaCid,
      manifestCid: event.manifestCid,
      requester: event.requester,
    });
    await this.deps.ledger.recordSpvVerdict(event.eventId, result);
    return result;
  }

  /** Settles an event whose request was already processed, without redoing any work. */
  private async settleDuplicate(
    event: IVerificationRequestEvent,
    entry: RequestLedgerEntry
  ): Promise<"duplicate"> {
    if (entry.status === ProcessedRequestStatus.COMPLETED) {
      if (!entry.transactionHash) {
        throw new AppError(
          `Processed request '${event.eventId}' is completed without a transaction hash`,
          500,
          "PROCESSED_REQUEST_INCONSISTENT"
        );
      }
      await this.deps.events.markCompleted(event._id, this.workerId, {
        transactionHash: entry.transactionHash,
        ...(entry.certificateId !== undefined ? { certificateId: entry.certificateId } : {}),
      });
    } else {
      const reason = entry.failureReason ?? "Request was already processed and failed";
      await this.failJob(entry.verificationJobId, reason);
      await this.deps.events.markFailed(event._id, this.workerId, reason);
    }
    this.deps.logger.info("Verification worker: duplicate request skipped", {
      workerId: this.workerId,
      eventId: event.eventId,
      jobId: entry.verificationJobId,
      status: entry.status,
    });
    return "duplicate";
  }

  private async settleFromTerminalJob(
    event: IVerificationRequestEvent,
    job: IVerificationJob
  ): Promise<"completed" | "rejected"> {
    if (job.status === VerificationStatus.COMPLETED && job.stellarTransactionHash) {
      const completion: CompletionOutcome = { transactionHash: job.stellarTransactionHash };
      await this.deps.ledger.markCompleted(event.eventId, completion);
      await this.deps.events.markCompleted(event._id, this.workerId, completion);
      return "completed";
    }
    const reason = job.errorMessage ?? `Verification job ended in '${job.status}'`;
    await this.deps.ledger.markFailed(event.eventId, reason);
    await this.deps.events.markFailed(event._id, this.workerId, reason);
    return "rejected";
  }

  private async handleFailure(
    event: IVerificationRequestEvent,
    jobId: string | undefined,
    err: unknown
  ): Promise<void> {
    const message = describeError(err);
    const ctx = {
      workerId: this.workerId,
      eventId: event.eventId,
      jobId,
      attempt: event.attempts,
      error: message,
      ...(err instanceof AppError && err.code ? { code: err.code } : {}),
      ...(err instanceof TransactionFailedError ? { diagnostics: err.diagnostics } : {}),
    };

    if (err instanceof LeaseLostError) {
      this.deps.logger.warn("Verification worker: lease lost, abandoning event", ctx);
      return;
    }

    try {
      if (isRetryableError(err) && event.attempts < this.deps.config.maxAttempts) {
        const delay = Math.min(
          this.deps.config.retryBaseMs * 2 ** (event.attempts - 1),
          MAX_RETRY_DELAY_MS
        );
        const nextAttemptAt = new Date(this.now().getTime() + delay);
        await this.deps.events.scheduleRetry(event._id, this.workerId, nextAttemptAt, message);
        this.deps.logger.warn("Verification worker: retry scheduled", {
          ...ctx,
          nextAttemptAt: nextAttemptAt.toISOString(),
        });
        return;
      }

      // Permanent failure. Every write below is idempotent; once the ledger
      // entry is failed, a reclaim of this event only settles the job and event.
      const reason =
        isRetryableError(err) || (err instanceof AppError && err.code === MAX_ATTEMPTS_EXCEEDED)
          ? DeadLetterReason.RETRIES_EXHAUSTED
          : DeadLetterReason.NON_RETRYABLE;
      await this.deps.ledger.deadLetter({
        requestId: event.eventId,
        ...(jobId ? { verificationJobId: jobId } : {}),
        mediaCid: event.mediaCid,
        manifestCid: event.manifestCid,
        requester: event.requester,
        attempts: event.attempts,
        reason,
        errorMessage: message,
        ...(err instanceof AppError && err.code ? { errorCode: err.code } : {}),
      });
      await this.deps.ledger.markFailed(event.eventId, message);
      await this.failJob(jobId, message);
      await this.deps.events.markFailed(event._id, this.workerId, message);
      this.deps.logger.error("Verification worker: event dead-lettered", { ...ctx, deadLetterReason: reason });
    } catch (recordErr) {
      // The event stays leased; it is reclaimed once the lease expires.
      this.deps.logger.error("Verification worker: could not record failure", {
        ...ctx,
        recordError: describeError(recordErr),
      });
    }
  }

  private async failJob(jobId: string | undefined, message: string): Promise<void> {
    if (!jobId) return;
    const job = await this.deps.jobs.getJob(jobId);
    if (isTerminal(job.status)) return;
    await this.deps.jobs.updateJobStatus(jobId, {
      status: VerificationStatus.FAILED,
      errorMessage: message,
    });
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof mongoose.mongo.MongoServerError && err.code === 11000;
}

function toLedgerEntry(doc: IProcessedRequest): RequestLedgerEntry {
  const { requestId: _requestId, verificationJobId, expiresAt: _expiresAt, ...rest } = doc;
  return {
    ...rest,
    ...(verificationJobId ? { verificationJobId: String(verificationJobId) } : {}),
  };
}

function ledgerExpiry(): Date {
  return new Date(Date.now() + PROCESSED_REQUEST_TTL_SECONDS * 1000);
}

/** MongoDB-backed ledger: uniqueness of `requestId` is enforced by the collection's unique index. */
export const mongoRequestLedger: RequestLedger = {
  async register(requestId) {
    try {
      const doc = await ProcessedRequestModel.create({ requestId });
      return { created: true, entry: toLedgerEntry(doc.toObject()) };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
    // Another registration won the unique index; continue from its entry.
    const existing = await ProcessedRequestModel.findOne({ requestId }).lean<IProcessedRequest>();
    if (!existing) {
      // Expired between the insert and the read; the next attempt registers afresh.
      throw new Error(`Processed request '${requestId}' disappeared during registration`);
    }
    return { created: false, entry: toLedgerEntry(existing) };
  },

  async attachJob(requestId, jobId) {
    await ProcessedRequestModel.updateOne(
      { requestId, verificationJobId: { $exists: false } },
      { $set: { verificationJobId: new mongoose.Types.ObjectId(jobId) } }
    );
  },

  async recordSpvVerdict(requestId, result) {
    await ProcessedRequestModel.updateOne(
      { requestId },
      {
        $set: {
          spvVerified: result.verified,
          contentHash: result.contentHash,
          manifestHash: result.manifestHash,
          ...(result.reason !== undefined ? { spvFailureReason: result.reason } : {}),
        },
      }
    );
  },

  async markCompleted(requestId, outcome) {
    await ProcessedRequestModel.updateOne(
      { requestId },
      {
        $set: { status: ProcessedRequestStatus.COMPLETED, expiresAt: ledgerExpiry(), ...outcome },
        $unset: { failureReason: 1 },
      },
      { upsert: true }
    );
  },

  async markFailed(requestId, reason) {
    try {
      await ProcessedRequestModel.updateOne(
        { requestId, status: { $ne: ProcessedRequestStatus.COMPLETED } },
        { $set: { status: ProcessedRequestStatus.FAILED, failureReason: reason, expiresAt: ledgerExpiry() } },
        { upsert: true }
      );
    } catch (err) {
      // The upsert collides only with an entry that is already completed.
      if (!isDuplicateKeyError(err)) throw err;
    }
  },

  async deadLetter(input) {
    const { verificationJobId, errorMessage, ...fields } = input;
    try {
      await DeadLetteredRequestModel.updateOne(
        { requestId: input.requestId },
        {
          $setOnInsert: {
            ...fields,
            ...(verificationJobId ? { verificationJobId: new mongoose.Types.ObjectId(verificationJobId) } : {}),
            errorMessage: errorMessage.slice(0, 1000),
            deadLetteredAt: new Date(),
          },
        },
        { upsert: true }
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  },
};

/** Builds a worker wired to the production services and configuration. */
export function createVerificationWorker(): VerificationWorker {
  const oracle = loadOracleConfig();
  const queryClient = new SorobanContractQueryClient(oracle.keypair.publicKey());
  const authorization = new RegistryAuthorizationService(
    new RegistryContract(env.STELLAR_REGISTRY_CONTRACT_ID, queryClient),
    new OracleContract(env.STELLAR_ORACLE_CONTRACT_ID, queryClient)
  );

  return new VerificationWorker({
    events: verificationRequestEventService,
    jobs: verificationService,
    ledger: mongoRequestLedger,
    verifier: spvVerifierService,
    attestations: attestationService,
    authorization,
    soroban: sorobanService,
    oracle,
    config: loadVerificationWorkerConfig(),
    logger,
  });
}