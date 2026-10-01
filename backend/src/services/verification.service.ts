import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

import { VerificationJobModel } from "../models/verificationJob.model";
import { AppError } from "../errors/AppError";
import { VerificationStateError } from "../errors/VerificationStateError";
import Manifest from "../models/Manifest.model";
import { ipfsService } from "./ipfs.service";
import { generateDeterministicHash } from "../utils/crypto";
import {
  VerificationStatus,
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
import { statusStreamService } from "./statusStream.service";

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
  job: { timeline: Array<{ stage: VerificationStatus; at: Date; txHash?: string }> },
  stage: VerificationStatus,
  txHash?: string
): void {
  job.timeline.push({
    stage,
    at: new Date(),
    ...(txHash ? { txHash } : {}),
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
    timeline: [{ stage: VerificationStatus.PENDING, at: new Date() }],
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseRangeBound(value: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

function emptyStatusCounts(): JobStatusCounts {
  return {
    pending: 0,
    processing: 0,
    tee_verifying: 0,
    minting: 0,
    completed: 0,
    failed: 0,
  };
}

function isStatusKey(value: string): value is keyof JobStatusCounts {
  return value in emptyStatusCounts();
}

async function assertJobOwner(id: string, ownerPublicKey: string): Promise<IVerificationJob> {
  assertValidObjectId(id);

  const job = await VerificationJobModel.findById(id).lean<IVerificationJob>();
  if (!job || job.ownerPublicKey !== ownerPublicKey) {
    throw new AppError(
      `Verification job not found: '${id}'`,
      StatusCodes.NOT_FOUND,
      "JOB_NOT_FOUND"
    );
  }

  return job;
}

async function listJobs(query: ListVerificationJobsQuery): Promise<ListVerificationJobsResult> {
  const filter: Record<string, unknown> = {
    ownerPublicKey: query.ownerPublicKey,
  };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.dateFrom || query.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (query.dateFrom) createdAt.$gte = parseRangeBound(query.dateFrom, false);
    if (query.dateTo) createdAt.$lte = parseRangeBound(query.dateTo, true);
    if (
      createdAt.$gte &&
      createdAt.$lte &&
      createdAt.$gte.getTime() > createdAt.$lte.getTime()
    ) {
      throw new AppError(
        "dateFrom must be earlier than or equal to dateTo",
        StatusCodes.BAD_REQUEST,
        "INVALID_DATE_RANGE"
      );
    }
    filter.createdAt = createdAt;
  }

  if (query.contentHash) {
    filter.contentHash = {
      $regex: `^${escapeRegex(query.contentHash)}`,
      $options: "i",
    };
  }

  const [jobs, total] = await Promise.all([
    VerificationJobModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(query.skip)
      .limit(query.limit)
      .lean<IVerificationJob[]>(),
    VerificationJobModel.countDocuments(filter),
  ]);

  return {
    jobs,
    total,
    limit: query.limit,
    skip: query.skip,
  };
}

async function getJobStats(ownerPublicKey: string): Promise<JobStats> {
  const match = { ownerPublicKey };

  const [grouped, trendRows] = await Promise.all([
    VerificationJobModel.aggregate<{ _id: string; count: number }>([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    VerificationJobModel.aggregate<{
      _id: { bucket: string; status: string };
      count: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: {
            bucket: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
            },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.bucket": 1 } },
    ]),
  ]);

  const counts = emptyStatusCounts();
  for (const row of grouped) {
    if (isStatusKey(row._id)) {
      counts[row._id] = row.count;
    }
  }

  const buckets = new Map<string, JobTrendBucket>();
  for (const row of trendRows) {
    const bucketKey = row._id.bucket;
    const bucket = buckets.get(bucketKey) ?? {
      bucket: bucketKey,
      counts: emptyStatusCounts(),
      total: 0,
    };
    if (isStatusKey(row._id.status)) {
      bucket.counts[row._id.status] = row.count;
      bucket.total += row.count;
    }
    buckets.set(bucketKey, bucket);
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const terminal = counts.completed + counts.failed;
  const successRate = terminal === 0 ? 0 : Number((counts.completed / terminal).toFixed(4));

  return {
    counts,
    total,
    successRate,
    trends: Array.from(buckets.values()),
  };
}

async function updateJobStatus(
  id: string,
  dto: UpdateVerificationStatusDTO
}): Promise<IVerificationJob> {
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

  recordTimelineEntry(job, nextStatus, dto.stellarTransactionHash);

  await job.save();

  await statusStreamService.broadcast(String(job._id), nextStatus, {
    teeAttestationHash: job.teeAttestationHash,
    teeSignature: job.teeSignature,
    codeMeasurementHash: job.codeMeasurementHash,
    stellarTransactionHash: job.stellarTransactionHash,
    errorMessage: job.errorMessage,
  });

  return job.toObject<IVerificationJob>();
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

  recordTimelineEntry(job, nextStatus);

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
    await job.save();
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
    await job.save();
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
  advanceFromAttestationEvent,
  completeFromMintEvent,
  verifyManifestIntegrity,
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
