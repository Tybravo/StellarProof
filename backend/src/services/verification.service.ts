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

function assertValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid job ID: '${id}'`,
      StatusCodes.BAD_REQUEST,
      "INVALID_ID"
    );
  }
}

function assertValidTransition(
  currentStatus: VerificationStatus,
  nextStatus: VerificationStatus
): void {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.has(nextStatus)) {
    throw new VerificationStateError(currentStatus, nextStatus);
  }
}

async function createJob(dto: CreateVerificationJobDTO): Promise<IVerificationJob> {
  const job = await VerificationJobModel.create({
    ownerPublicKey: dto.ownerPublicKey,
    contentHash: dto.contentHash,
    status: VerificationStatus.PENDING,
    ...(dto.webhookUrl ? { webhookUrl: dto.webhookUrl } : {}),
  });

  return job.toObject<IVerificationJob>();
}

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

async function getJobsByOwner(ownerPublicKey: string): Promise<IVerificationJob[]> {
  return VerificationJobModel.find({ ownerPublicKey })
    .sort({ createdAt: -1 })
    .lean<IVerificationJob[]>();
}

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

  assertValidTransition(currentStatus, nextStatus);

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

  job.status = nextStatus;

  if (dto.teeAttestationHash !== undefined) job.teeAttestationHash = dto.teeAttestationHash;
  if (dto.teeSignature !== undefined) job.teeSignature = dto.teeSignature;
  if (dto.codeMeasurementHash !== undefined) job.codeMeasurementHash = dto.codeMeasurementHash;
  if (dto.stellarTransactionHash !== undefined)
    job.stellarTransactionHash = dto.stellarTransactionHash;
  if (dto.errorMessage !== undefined) job.errorMessage = dto.errorMessage;

  await job.save();

  return job.toObject<IVerificationJob>();
}

export const verificationService = {
  createJob,
  getJob,
  getJobsByOwner,
  updateJobStatus,
} as const;
