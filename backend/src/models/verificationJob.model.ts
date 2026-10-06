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
 */
import { Schema, model, Document } from "mongoose";
import { VerificationStatus, VerificationWebhookEvent } from "../types/verification.types";
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

const VerificationTimelineEntrySchema = new Schema<ITimelineEntry>(
  {
    stage: {
      type: String,
      required: [true, "timeline entry stage is required"],
      enum: {
        values: ALL_STATUSES,
        message: `timeline entry stage must be one of: ${ALL_STATUSES.join(", ")}`,
      },
    },
    at: {
      type: Date,
      required: [true, "timeline entry timestamp is required"],
      default: Date.now,
    },
    // message: {
    //   type: String,
    //   trim: true,
    //   default: undefined,
    // },
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
