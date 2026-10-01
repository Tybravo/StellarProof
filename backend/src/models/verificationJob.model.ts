/**
 * Mongoose model for VerificationJob documents.
 *
 * Schema design decisions:
 * - `contentHash` is indexed (not unique): the same content may be re-submitted
 *   after a failed job.
 * - `ownerPublicKey` is indexed: efficient queries by submitter.
 * - `status` is indexed: efficient filtering by lifecycle state.
 * - TEE and blockchain fields are optional at schema level; the service layer
 *   enforces their presence when the associated state transition occurs.
 * - Timeline entries are persisted as an array of sub-documents so the full
 *   state-machine traversal can be audited.
 * - Timestamps are enabled via Mongoose options (adds `createdAt` / `updatedAt`).
 *
 * Also defines the worker's per-request bookkeeping, keyed by the request
 * identity (`VerificationRequestEvent.eventId`):
 * - `ProcessedRequest`: the deduplication ledger. `requestId` is unique, so
 *   concurrent registrations of the same request are arbitrated by MongoDB.
 *   It checkpoints the SPV verdict so a retry never re-runs verification, and
 *   expires (TTL) 30 days after the request reaches a terminal state.
 * - `DeadLetteredRequest`: requests that failed permanently, kept for manual
 *   inspection in the `deadLetteredRequests` collection (no TTL).
 */
import { Schema, model, Document, Types } from "mongoose";
import { VerificationStatus } from "../types/verification.types";
import type { IVerificationJob, ITimelineEntry } from "../types/verification.types";

export type VerificationJobDocument = IVerificationJob & Document;

const ALL_STATUSES = Object.values(VerificationStatus);
const ALL_WEBHOOK_EVENTS = Object.values(VerificationWebhookEvent);
const ACTIVE_STATUSES = [
  VerificationStatus.PENDING,
  VerificationStatus.PROCESSING,
  VerificationStatus.TEE_VERIFYING,
  VerificationStatus.MINTING,
];

const VerificationTimelineEntrySchema = new Schema<IVerificationTimelineEntry>(
  {
    status: {
      type: String,
      required: [true, "timeline entry status is required"],
      enum: {
        values: ALL_STATUSES,
        message: `timeline entry status must be one of: ${ALL_STATUSES.join(", ")}`,
      },
    },
    timestamp: {
      type: Date,
      required: [true, "timeline entry timestamp is required"],
      default: Date.now,
    },
    message: {
      type: String,
      trim: true,
      default: undefined,
    },
    actor: {
      type: String,
      enum: ["worker", "oracle", "user"],
      required: true,
      default: "worker",
    },
  },
  { _id: false, versionKey: false }
);

const VerificationJobSchema = new Schema<VerificationJobDocument>(
  {
    manifestId: {
      type: Schema.Types.ObjectId,
      ref: "Manifest",
      index: true,
      default: undefined,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      index: true,
      default: undefined,
    },
    ownerPublicKey: {
      type: String,
      required: [true, "ownerPublicKey is required"],
      trim: true,
      index: true,
    },
    contentHash: {
      type: String,
      required: [true, "contentHash is required"],
      trim: true,
      index: true,
    },
    manifestHash: {
      type: String,
      trim: true,
      index: true,
      default: undefined,
    },
    requestId: {
      type: String,
      trim: true,
      index: true,
      default: undefined,
    },
    status: {
      type: String,
      required: [true, "status is required"],
      enum: {
        values: ALL_STATUSES,
        message: `status must be one of: ${ALL_STATUSES.join(", ")}`,
      },
      default: VerificationStatus.PENDING,
      index: true,
    },

    // Timeline of state-machine transitions
    timeline: {
      type: [VerificationTimelineEntrySchema],
      default: [],
    },

    // TE attestation fields
    teeAttestationHash: {
      type: String,
      trim: true,
      default: undefined,
    },
    teeSignature: {
      type: String,
      trim: true,
      default: undefined,
    },
    codeMeasurementHash: {
      type: String,
      trim: true,
      default: undefined,
    },

    // Blockchain fields
    stellarTransactionHash: {
      type: String,
      trim: true,
      default: undefined,
    },
    attestationTransactionHash: {
      type: String,
      trim: true,
      default: undefined,
    },
    certificateId: {
      type: String,
      trim: true,
      index: true,
      default: undefined,
    },

    // Failure fields
    errorMessage: {
      type: String,
      trim: true,
      default: undefined,
    },

    webhookUrl: {
      type: String,
      trim: true,
      default: undefined,
    },
    webhookEvents: {
      type: [String],
      enum: ALL_WEBHOOK_EVENTS,
      default: ALL_WEBHOOK_EVENTS,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

VerificationJobSchema.index(
  { contentHash: 1 },
  {
    unique: true,
    name: "unique_active_job_per_content_hash",
    partialFilterExpression: { status: { $in: ACTIVE_STATUSES } },
  }
);

export const VerificationJobModel = model<VerificationJobDocument>(
  "VerificationJob",
  VerificationJobSchema
);

// ---------------------------------------------------------------------------
// Processed-request ledger (deduplication + idempotency checkpoints)
// ---------------------------------------------------------------------------

/** Retention for terminal ledger entries, matching other worker audit records. */
export const PROCESSED_REQUEST_TTL_SECONDS = 30 * 24 * 60 * 60;

export enum ProcessedRequestStatus {
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface IProcessedRequest {
  /** Stable request identity: the unique `VerificationRequestEvent.eventId`. */
  requestId: string;
  verificationJobId?: Types.ObjectId;
  status: ProcessedRequestStatus;

  /** SPV checkpoint: set once verification reaches a verdict. */
  spvVerified?: boolean;
  contentHash?: string;
  manifestHash?: string;
  spvFailureReason?: string;

  /** Outcome, set when the request reaches a terminal state. */
  transactionHash?: string;
  certificateId?: string;
  failureReason?: string;

  /** Set only on terminal states; MongoDB's TTL monitor removes the entry after it. */
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProcessedRequestDocument = IProcessedRequest & Document;

const ProcessedRequestSchema = new Schema<ProcessedRequestDocument>(
  {
    requestId: {
      type: String,
      required: [true, "requestId is required"],
      trim: true,
      unique: true,
    },
    verificationJobId: {
      type: Schema.Types.ObjectId,
      ref: "VerificationJob",
      index: true,
      default: undefined,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ProcessedRequestStatus),
      default: ProcessedRequestStatus.PROCESSING,
    },
    spvVerified: { type: Boolean, default: undefined },
    contentHash: { type: String, trim: true, default: undefined },
    manifestHash: { type: String, trim: true, default: undefined },
    spvFailureReason: { type: String, default: undefined },
    transactionHash: { type: String, trim: true, default: undefined },
    certificateId: { type: String, trim: true, default: undefined },
    failureReason: { type: String, default: undefined },
    expiresAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "processedRequests",
  }
);

// Entries without `expiresAt` (still in flight) are never expired.
ProcessedRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ProcessedRequestModel = model<ProcessedRequestDocument>(
  "ProcessedRequest",
  ProcessedRequestSchema
);

// ---------------------------------------------------------------------------
// Dead-lettered requests
// ---------------------------------------------------------------------------

export enum DeadLetterReason {
  /** A retryable failure persisted through the maximum number of attempts. */
  RETRIES_EXHAUSTED = "retries_exhausted",
  /** The failure can never succeed on a later attempt. */
  NON_RETRYABLE = "non_retryable",
}

export interface IDeadLetteredRequest {
  requestId: string;
  verificationJobId?: Types.ObjectId;
  mediaCid: string;
  manifestCid: string;
  requester: string;
  attempts: number;
  reason: DeadLetterReason;
  errorMessage: string;
  errorCode?: string;
  deadLetteredAt: Date;
}

export type DeadLetteredRequestDocument = IDeadLetteredRequest & Document;

const DeadLetteredRequestSchema = new Schema<DeadLetteredRequestDocument>(
  {
    requestId: {
      type: String,
      required: [true, "requestId is required"],
      trim: true,
      unique: true,
    },
    verificationJobId: {
      type: Schema.Types.ObjectId,
      ref: "VerificationJob",
      index: true,
      default: undefined,
    },
    mediaCid: { type: String, required: true, trim: true },
    manifestCid: { type: String, required: true, trim: true },
    requester: { type: String, required: true, trim: true, index: true },
    attempts: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      required: true,
      enum: Object.values(DeadLetterReason),
    },
    errorMessage: { type: String, required: true, maxlength: 1000 },
    errorCode: { type: String, default: undefined },
    deadLetteredAt: { type: Date, required: true, default: Date.now },
  },
  {
    versionKey: false,
    collection: "deadLetteredRequests",
  }
);

export const DeadLetteredRequestModel = model<DeadLetteredRequestDocument>(
  "DeadLetteredRequest",
  DeadLetteredRequestSchema
);
