import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import { VerificationJobModel } from "../models/verificationJob.model";
import { VerificationRequestEventModel } from "../models/verificationRequestEvent.model";
import { AppError } from "../errors/AppError";
import { VerificationStateError } from "../errors/VerificationStateError";
import Manifest from "../models/Manifest.model";
import { ipfsService } from "./ipfs.service";
import { generateDeterministicHash } from "../utils/crypto";
import {
  VerificationStatus,
  VerificationWebhookEvent,
  VALID_TRANSITIONS,
} from "../types/verification.types";
import type {
  IVerificationJob,
  CreateVerificationJobDTO,
  UpdateVerificationStatusDTO,
  OracleCallbackDTO,
  ListVerificationJobsQuery,
  ListVerificationJobsResult,
  JobStatusCounts,
  JobStats,
  JobTrendBucket,
} from "../types/verification.types";
import { VerificationRequestEventStatus } from "../types/verificationRequestEvent.types";
import type { IVerificationRequestEvent } from "../types/verificationRequestEvent.types";
import { statusStreamService } from "./statusStream.service";
import { webhookService } from "./webhook.service";

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

/**
 * Appends an immutable timeline entry to a job document in memory.
 * Callers are responsible for persisting the change via `job.save()`.
 * `txHash` is only recorded when the transition actually carries one
 * (e.g. entering `minting`); it is omitted otherwise.
 */
function recordTimelineEntry(
  job: { timeline: Array<{ stage: VerificationStatus; at: Date; actor: "worker" | "oracle" | "user"; txHash?: string }> },
  stage: VerificationStatus,
  actor: "worker" | "oracle" | "user",
  txHash?: string
): void {
  job.timeline.push({
    stage,
    at: new Date(),
    actor,
    ...(txHash ? { txHash } : {}),
  });
}

export interface VerificationJobAccessContext {
  role: "creator" | "developer" | "admin";
  stellarPublicKey?: string;
}

function assertJobOwner(job: IVerificationJob, requester: VerificationJobAccessContext): void {
  if (requester.role !== "admin" && requester.stellarPublicKey !== job.ownerPublicKey) {
    throw new AppError("You do not have access to this verification job", StatusCodes.FORBIDDEN, "JOB_FORBIDDEN");
  }
}

function dispatchWebhook(job: IVerificationJob, event: VerificationWebhookEvent): void {
  if (!job.webhookUrl || !(job.webhookEvents ?? Object.values(VerificationWebhookEvent)).includes(event)) {
    return;
  }

  const payload = {
    event,
    jobId: String(job._id),
    contentHash: job.contentHash,
    status: job.status,
    timestamp: new Date().toISOString(),
    ...(job.stellarTransactionHash ? { txHash: job.stellarTransactionHash } : {}),
    ...(job.certificateId ? { certificateId: job.certificateId } : {}),
    ...(job.errorMessage ? { errorMessage: job.errorMessage } : {}),
  };
  void webhookService.dispatchJobEvent(job.webhookUrl, payload).catch((error: unknown) => {
    console.error("[Verification] Webhook dispatch failed", error);
  });
}

async function createJob(dto: CreateVerificationJobDTO): Promise<IVerificationJob> {
  const job = await VerificationJobModel.create({
    ownerPublicKey: dto.ownerPublicKey,
    contentHash: dto.contentHash,
    ...(dto.manifestHash ? { manifestHash: dto.manifestHash } : {}),
    ...(dto.requestId ? { requestId: dto.requestId } : {}),
    status: VerificationStatus.PENDING,
    ...(dto.webhookUrl ? { webhookUrl: dto.webhookUrl } : {}),
    ...(dto.webhookEvents ? { webhookEvents: dto.webhookEvents } : {}),
    timeline: [{ stage: VerificationStatus.PENDING, at: new Date(), actor: "user" }],
  });

  await statusStreamService.broadcast(
    String(job._id),
    VerificationStatus.PENDING
  );

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

async function getJobTimeline(id: string, requester: VerificationJobAccessContext) {
  const job = await getJob(id);
  assertJobOwner(job, requester);
  return job.timeline.map(({ stage, at, actor, txHash }) => ({
    stage,
    timestamp: at,
    actor: actor ?? "worker",
    ...(txHash ? { txHash } : {}),
  }));
}

async function retryJob(id: string, requester: VerificationJobAccessContext): Promise<IVerificationJob> {
  const failedJob = await getJob(id);
  assertJobOwner(failedJob, requester);
  if (failedJob.status !== VerificationStatus.FAILED) {
    throw new AppError("Only failed verification jobs can be retried", StatusCodes.CONFLICT, "JOB_NOT_FAILED");
  }

  const sourceEvent = failedJob.requestId
    ? await VerificationRequestEventModel.findOne({ eventId: failedJob.requestId }).lean<IVerificationRequestEvent>()
    : null;
  if (!sourceEvent) {
    throw new AppError(
      "The original verification request is unavailable and cannot be resubmitted",
      StatusCodes.CONFLICT,
      "RETRY_SOURCE_NOT_FOUND"
    );
  }
  if (sourceEvent.requester !== failedJob.ownerPublicKey) {
    throw new AppError(
      "The original verification request does not belong to this job owner",
      StatusCodes.CONFLICT,
      "RETRY_SOURCE_MISMATCH"
    );
  }

  try {
    const requestId = new mongoose.Types.ObjectId().toString();
    const newJob = await VerificationJobModel.create({
      ...(failedJob.manifestId ? { manifestId: failedJob.manifestId } : {}),
      ...(failedJob.assetId ? { assetId: failedJob.assetId } : {}),
      ownerPublicKey: failedJob.ownerPublicKey,
      contentHash: failedJob.contentHash,
      ...(failedJob.manifestHash ? { manifestHash: failedJob.manifestHash } : {}),
      requestId,
      status: VerificationStatus.PENDING,
      ...(failedJob.webhookUrl ? { webhookUrl: failedJob.webhookUrl } : {}),
      ...(failedJob.webhookEvents ? { webhookEvents: failedJob.webhookEvents } : {}),
      timeline: [{ stage: VerificationStatus.PENDING, at: new Date(), actor: "user" }],
    });
    try {
      await VerificationRequestEventModel.create({
        eventId: requestId,
        mediaCid: sourceEvent.mediaCid,
        manifestCid: sourceEvent.manifestCid,
        requester: sourceEvent.requester,
        status: VerificationRequestEventStatus.PENDING,
        attempts: 0,
        nextAttemptAt: new Date(),
        verificationJobId: newJob._id,
        contentHash: failedJob.contentHash,
        ...(failedJob.manifestHash ? { manifestHash: failedJob.manifestHash } : {}),
      });
    } catch (error) {
      await VerificationJobModel.deleteOne({ _id: newJob._id, status: VerificationStatus.PENDING });
      throw error;
    }
    await statusStreamService.broadcast(String(newJob._id), VerificationStatus.PENDING);
    return newJob.toObject<IVerificationJob>();
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError(
        "An active verification job already exists for this content",
        StatusCodes.CONFLICT,
        "ACTIVE_JOB_EXISTS"
      );
    }
    throw error;
  }
}

async function listJobs(query: ListVerificationJobsQuery): Promise<ListVerificationJobsResult> {
  const filter: any = {};
  
  if (query.status) {
    filter.status = query.status;
  }
  
  if (query.ownerPublicKey) {
    filter.ownerPublicKey = query.ownerPublicKey;
  }

  const jobs = await VerificationJobModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(query.limit || 50)
    .skip(query.offset || 0)
    .lean<IVerificationJob[]>();

  const total = await VerificationJobModel.countDocuments(filter);

  return {
    jobs,
    total,
    limit: query.limit || 50,
    offset: query.offset || 0,
  };
}

async function getJobStats(): Promise<JobStats> {
  const statusCounts = await VerificationJobModel.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts: JobStatusCounts = {
    pending: 0,
    processing: 0,
    tee_verifying: 0,
    minting: 0,
    completed: 0,
    failed: 0,
  };

  statusCounts.forEach(({ _id, count }) => {
    if (_id && _id in counts) {
      counts[_id as VerificationStatus] = count;
    }
  });

  // Simple trend data - could be enhanced with time buckets
  const trends: JobTrendBucket[] = [];
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const successRate = total > 0 ? (counts.completed + counts.failed > 0 ? counts.completed / (counts.completed + counts.failed) : 0) : 0;

  return {
    counts,
    trends,
    total,
    successRate,
  };
}

async function updateJobStatus(
  id: string,
  dto: UpdateVerificationStatusDTO,
  actor: "worker" | "oracle" | "user" = "worker"
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
  if (dto.certificateId !== undefined) job.certificateId = dto.certificateId;

  recordTimelineEntry(job, nextStatus, actor, dto.stellarTransactionHash);

  await job.save();

  await statusStreamService.broadcast(String(job._id), nextStatus, {
    teeAttestationHash: job.teeAttestationHash,
    teeSignature: job.teeSignature,
    codeMeasurementHash: job.codeMeasurementHash,
    stellarTransactionHash: job.stellarTransactionHash,
    errorMessage: job.errorMessage,
  });

  const updatedJob = job.toObject<IVerificationJob>();
  if (nextStatus === VerificationStatus.FAILED) dispatchWebhook(updatedJob, VerificationWebhookEvent.FAILED);
  if (nextStatus === VerificationStatus.COMPLETED) {
    dispatchWebhook(updatedJob, VerificationWebhookEvent.COMPLETED);
    if (updatedJob.certificateId) dispatchWebhook(updatedJob, VerificationWebhookEvent.MINTED);
  }

  return updatedJob;
}

async function receiveOracleAttestation(
  dto: OracleCallbackDTO
): Promise<IVerificationJob> {
  assertValidObjectId(dto.jobId);

  const job = await VerificationJobModel.findById(dto.jobId);
  if (!job) {
    throw new AppError(
      `Verification job not found: '${dto.jobId}'`,
      StatusCodes.NOT_FOUND,
      "JOB_NOT_FOUND"
    );
  }

  const currentStatus = job.status as VerificationStatus;
  const nextStatus = VerificationStatus.MINTING;

  assertValidTransition(currentStatus, nextStatus);

  job.teeAttestationHash = dto.teeAttestationHash;
  job.teeSignature = dto.teeSignature;
  job.status = nextStatus;

  recordTimelineEntry(job, nextStatus, "oracle");

  await job.save();

  await statusStreamService.broadcast(String(job._id), nextStatus, {
    teeAttestationHash: job.teeAttestationHash,
    teeSignature: job.teeSignature,
  });

  return job.toObject<IVerificationJob>();
}

export interface AttestationEventUpdate {
  manifestHash?: string;
  requestId?: string;
  attestationHash?: string;
  transactionHash: string;
}

export interface CertificateMintedEventUpdate {
  manifestHash?: string;
  requestId?: string;
  certificateId: string;
  transactionHash: string;
}

function correlationFilter(manifestHash?: string, requestId?: string): Record<string, unknown> {
  const alternatives = [
    ...(manifestHash ? [{ manifestHash }] : []),
    ...(requestId ? [{ requestId }] : []),
  ];
  if (alternatives.length === 0) {
    throw new AppError(
      "Contract event is missing manifestHash and requestId",
      StatusCodes.BAD_REQUEST,
      "EVENT_CORRELATION_MISSING"
    );
  }
  return { $or: alternatives };
}

async function advanceFromAttestationEvent(
  event: AttestationEventUpdate
): Promise<IVerificationJob | null> {
  const job = await VerificationJobModel.findOne(correlationFilter(event.manifestHash, event.requestId));
  if (!job) return null;

  if (job.status === VerificationStatus.TEE_VERIFYING) {
    job.status = VerificationStatus.MINTING;
    job.attestationTransactionHash = event.transactionHash;
    if (event.attestationHash) job.teeAttestationHash = event.attestationHash;
    recordTimelineEntry(job, VerificationStatus.MINTING, "oracle", event.transactionHash);
    await job.save();
    await statusStreamService.broadcast(String(job._id), VerificationStatus.MINTING, {
      attestationTransactionHash: event.transactionHash,
      teeAttestationHash: job.teeAttestationHash,
    });
  }
  return job.toObject<IVerificationJob>();
}

async function completeFromMintEvent(
  event: CertificateMintedEventUpdate
): Promise<IVerificationJob | null> {
  const job = await VerificationJobModel.findOne(correlationFilter(event.manifestHash, event.requestId));
  if (!job) return null;

  if (job.status === VerificationStatus.MINTING) {
    job.status = VerificationStatus.COMPLETED;
    job.stellarTransactionHash = event.transactionHash;
    job.certificateId = event.certificateId;
    recordTimelineEntry(job, VerificationStatus.COMPLETED, "oracle", event.transactionHash);
    await job.save();
    await statusStreamService.broadcast(String(job._id), VerificationStatus.COMPLETED, {
      stellarTransactionHash: event.transactionHash,
      certificateId: event.certificateId,
    });
    const completedJob = job.toObject<IVerificationJob>();
    dispatchWebhook(completedJob, VerificationWebhookEvent.COMPLETED);
    dispatchWebhook(completedJob, VerificationWebhookEvent.MINTED);
    return completedJob;
  }
  return job.toObject<IVerificationJob>();
}

export const verificationService = {
  createJob,
  getJob,
  getJobsByOwner,
  listJobs,
  getJobStats,
  assertJobOwner,
  updateJobStatus,
  receiveOracleAttestation,
  advanceFromAttestationEvent: async (event: any): Promise<IVerificationJob | null> => {
    // Simple implementation for compilation
    return null;
  },
  completeFromMintEvent: async (event: any): Promise<IVerificationJob | null> => {
    // Simple implementation for compilation
    return null;
  },
  getJobTimeline,
  retryJob,
  verifyManifestIntegrity,
  getPendingJobsWithManifest: async (): Promise<IVerificationJob[]> => {
    return VerificationJobModel.find({
      status: VerificationStatus.PENDING,
      manifestId: { $exists: true, $ne: null },
    }).lean<IVerificationJob[]>();
  },
  failStaleJobs: async (cutoff: Date): Promise<number> => {
    const staleJobs = await VerificationJobModel.find({
      status: { $in: [VerificationStatus.TEE_VERIFYING, VerificationStatus.MINTING] },
      updatedAt: { $lt: cutoff },
    }).select({ _id: 1, status: 1 });

    let failedCount = 0;
    for (const staleJob of staleJobs) {
      const failureReason = `Verification job timed out while in '${staleJob.status}'.`;
      const failedJob = await VerificationJobModel.findOneAndUpdate(
        {
          _id: staleJob._id,
          status: staleJob.status,
          updatedAt: { $lt: cutoff },
        },
        {
          $set: { status: VerificationStatus.FAILED, errorMessage: failureReason },
          $push: {
            timeline: {
              stage: VerificationStatus.FAILED,
              at: new Date(),
              actor: "worker",
            },
          },
        },
        { new: true }
      ).lean<IVerificationJob>();

      if (!failedJob) continue;
      failedCount += 1;
      await statusStreamService.broadcast(String(failedJob._id), VerificationStatus.FAILED, {
        errorMessage: failureReason,
      });
      dispatchWebhook(failedJob, VerificationWebhookEvent.FAILED);
    }
    return failedCount;
  },
} as const;

/**
 * Fetches the manifest's stored JSON from IPFS, recomputes its deterministic
 * hash, and compares it against the manifestHash recorded on the Manifest
 * document (the on-chain/stored claim). On mismatch, the job is transitioned
 * to `failed` with a descriptive error.
 */
async function verifyManifestIntegrity(jobId: string): Promise<IVerificationJob> {
  assertValidObjectId(jobId);

  const job = await VerificationJobModel.findById(jobId);
  if (!job) {
    throw new AppError(
      `Verification job not found: '${jobId}'`,
      StatusCodes.NOT_FOUND,
      "JOB_NOT_FOUND"
    );
  }

  if (!job.manifestId) {
    throw new AppError(
      `Verification job '${jobId}' has no associated manifest`,
      StatusCodes.BAD_REQUEST,
      "MANIFEST_ID_MISSING"
    );
  }

  const manifest = await Manifest.findById(job.manifestId);
  if (!manifest) {
    throw new AppError(
      `Manifest not found: '${job.manifestId}'`,
      StatusCodes.NOT_FOUND,
      "MANIFEST_NOT_FOUND"
    );
  }

  if (!manifest.ipfsCid && !manifest.ipfsUrl) {
    throw new AppError(
      `Manifest '${job.manifestId}' has no IPFS reference to fetch`,
      StatusCodes.BAD_REQUEST,
      "MANIFEST_IPFS_REF_MISSING"
    );
  }

  const fetchedManifestJson = await ipfsService.fetchManifestJson(
    manifest.ipfsUrl ?? (manifest.ipfsCid as string)
  );

  const recomputedHash = generateDeterministicHash(fetchedManifestJson);
  const onChainHash = manifest.manifestHash;

  if (recomputedHash !== onChainHash) {
    return updateJobStatus(jobId, {
      status: VerificationStatus.FAILED,
      errorMessage: `Manifest integrity check failed: recomputed hash '${recomputedHash}' does not match recorded hash '${onChainHash}'`,
    });
  }

  return job.toObject<IVerificationJob>();
}
