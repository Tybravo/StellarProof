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
import cron from "node-cron";
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
import { attestationService, type Attestation, type AttestationInput } from "../services/attestation.service";
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
  type VerificationRequestEventServiceType,
} from "../services/verificationRequestEvent.service";
import logger from "../utils/logger";
import { VerificationStatus, type IVerificationJob } from "../types/verification.types";
import type { IVerificationRequestEvent } from "../types/verificationRequestEvent.types";

/** Upper bound on retry back-off regardless of attempt count. */
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;

type Logger = Pick<typeof logger, "info" | "warn" | "error" | "debug">;

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
      // Scan for pending jobs that need manifest verification
      const pendingJobs = await verificationService.getPendingJobsWithManifest();
      
      for (const job of pendingJobs) {
        try {
          await verifyManifestForJob(String(job._id));
          logger.info("Manifest verification completed", { 
            jobId: String(job._id),
            manifestHash: job.manifestHash 
          });
        } catch (error) {
          logger.error("Manifest verification failed", {
            jobId: String(job._id),
            error: describeError(error)
          });
        }
      }
    } catch (error) {
      logger.error("Manifest rehash worker error:", error);
    }
  });
}