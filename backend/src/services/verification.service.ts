/**
 * Verification Service – Business logic for creating and advancing
 * Verification Jobs through their lifecycle state machine.
 *
 * State machine (happy path):
 *   pending → processing → tee_verifying → minting → completed
 *
 * Any state can also transition to `failed`. Terminal states (completed,
 * failed) reject all further transitions with a VerificationStateError.
 *
 * No state can be skipped: e.g. going directly from `pending` to `completed`
 * is illegal and will throw VerificationStateError.
 */
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import { VerificationJobModel } from "../models/verificationJob.model";
import { AppError } from "../errors/AppError";
import { VerificationStateError } from "../errors/VerificationStateError";
import {
  VerificationStatus,
  VALID_TRANSITIONS,
} from "../types/verification.types";
import type {
  IVerificationJob,
  CreateVerificationJobDTO,
  UpdateVerificationStatusDTO,
} from "../types/verification.types";

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Validates that `id` is a syntactically correct MongoDB ObjectId.
 * Throws AppError 400 if not.
 */
function assertValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid job ID: '${id}'`,
      StatusCodes.BAD_REQUEST,
      "INVALID_ID"
    );
  }
}

/**
 * Core state machine guard.
 *
 * Checks whether moving a job from `currentStatus` → `nextStatus` is
 * permitted by the VALID_TRANSITIONS map.
 *
 * @throws {VerificationStateError} when the transition is illegal.
 */
function assertValidTransition(
  currentStatus: VerificationStatus,
  nextStatus: VerificationStatus
): void {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.has(nextStatus)) {
    throw new VerificationStateError(currentStatus, nextStatus);
  }
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Creates a new VerificationJob in the `pending` state.
 *
 * @throws {AppError} 422 – if `ownerPublicKey` or `contentHash` are absent
 *   (Mongoose validation; surfaced by the global error handler).
 */
async function createJob(
  dto: CreateVerificationJobDTO
): Promise<IVerificationJob> {
  const job = await VerificationJobModel.create({
    ownerPublicKey: dto.ownerPublicKey,
    contentHash: dto.contentHash,
    status: VerificationStatus.PENDING,
    ...(dto.webhookUrl ? { webhookUrl: dto.webhookUrl } : {}),
  });

  return job.toObject<IVerificationJob>();
}

/**
 * Retrieves a single VerificationJob by its MongoDB ObjectId.
 *
 * @throws {AppError} 400 – invalid ObjectId format.
 * @throws {AppError} 404 – no job found for the given id.
 */
async function getJob(id: string): Promise<IVerificationJob> {
  assertValidObjectId(id);

  const job = await VerificationJobModel.findById(id).lean<IVerificationJob>();
  if (!job) {
    throw new AppError(
      `Verification job not found: '${id}'`,
      StatusCodes.NOT_FOUND,
      "JOB_NOT_FOUND"
    );
  }

  return job;
}

/**
 * Returns all jobs belonging to a specific owner (Stellar public key).
 * Results are sorted newest-first.
 */
async function getJobsByOwner(
  ownerPublicKey: string
): Promise<IVerificationJob[]> {
  return VerificationJobModel.find({ ownerPublicKey })
    .sort({ createdAt: -1 })
    .lean<IVerificationJob[]>();
}

/**
 * Advances a VerificationJob to the requested `status` after enforcing all
 * state machine rules.
 *
 * State machine rules:
 * ┌────────────────┬────────────────────────────────────────────┐
 * │  From          │  Allowed transitions                       │
 * ├────────────────┼────────────────────────────────────────────┤
 * │  pending       │  processing, failed                        │
 * │  processing    │  tee_verifying, failed                     │
 * │  tee_verifying │  minting, failed                           │
 * │  minting       │  completed, failed                         │
 * │  completed     │  (none – terminal)                         │
 * │  failed        │  (none – terminal)                         │
 * └────────────────┴────────────────────────────────────────────┘
 *
 * Additional field requirements enforced per transition:
 * - → tee_verifying  : teeAttestationHash, teeSignature, codeMeasurementHash
 * - → minting        : stellarTransactionHash
 * - → failed         : errorMessage
 *
 * @throws {AppError} 400              – invalid id format.
 * @throws {AppError} 404              – job not found.
 * @throws {AppError} 409              – missing required fields for the transition.
 * @throws {VerificationStateError}    – illegal transition (extends AppError 409).
 */
async function updateJobStatus(
  id: string,
  dto: UpdateVerificationStatusDTO
): Promise<IVerificationJob> {
  assertValidObjectId(id);

  const job = await VerificationJobModel.findById(id);
  if (!job) {
    throw new AppError(
      `Verification job not found: '${id}'`,
      StatusCodes.NOT_FOUND,
      "JOB_NOT_FOUND"
    );
  }

  const currentStatus = job.status as VerificationStatus;
  const nextStatus = dto.status;

  // 1. Enforce state machine transition rules.
  assertValidTransition(currentStatus, nextStatus);

  // 2. Enforce per-transition field requirements.
  if (nextStatus === VerificationStatus.TEE_VERIFYING) {
    if (!dto.teeAttestationHash || !dto.teeSignature || !dto.codeMeasurementHash) {
      throw new AppError(
        "Transitioning to 'tee_verifying' requires teeAttestationHash, teeSignature, and codeMeasurementHash",
        StatusCodes.CONFLICT,
        "MISSING_TEE_FIELDS"
      );
    }
  }

  if (nextStatus === VerificationStatus.MINTING) {
    if (!dto.stellarTransactionHash) {
      throw new AppError(
        "Transitioning to 'minting' requires stellarTransactionHash",
        StatusCodes.CONFLICT,
        "MISSING_TRANSACTION_HASH"
      );
    }
  }

  if (nextStatus === VerificationStatus.FAILED) {
    if (!dto.errorMessage) {
      throw new AppError(
        "Transitioning to 'failed' requires errorMessage",
        StatusCodes.CONFLICT,
        "MISSING_ERROR_MESSAGE"
      );
    }
  }

  // 3. Apply the transition: update only the fields relevant to this step.
  job.status = nextStatus;

  if (dto.teeAttestationHash !== undefined) {
    job.teeAttestationHash = dto.teeAttestationHash;
  }
  if (dto.teeSignature !== undefined) {
    job.teeSignature = dto.teeSignature;
  }
  if (dto.codeMeasurementHash !== undefined) {
    job.codeMeasurementHash = dto.codeMeasurementHash;
  }
  if (dto.stellarTransactionHash !== undefined) {
    job.stellarTransactionHash = dto.stellarTransactionHash;
  }
  if (dto.errorMessage !== undefined) {
    job.errorMessage = dto.errorMessage;
  }

  await job.save();

  return job.toObject<IVerificationJob>();
}

// ---------------------------------------------------------------------------
// Exported service object
// ---------------------------------------------------------------------------
export const verificationService = {
  createJob,
  getJob,
  getJobsByOwner,
  updateJobStatus,
} as const;
