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
 * - Timestamps are enabled via Mongoose options (adds `createdAt` / `updatedAt`).
 */
import { Schema, model, Document } from "mongoose";
import { VerificationStatus } from "../types/verification.types";
import type { IVerificationJob } from "../types/verification.types";

export type VerificationJobDocument = IVerificationJob & Document;

const ALL_STATUSES = Object.values(VerificationStatus);

const VerificationJobSchema = new Schema<VerificationJobDocument>(
  {
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

    // TEE attestation fields
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const VerificationJobModel = model<VerificationJobDocument>(
  "VerificationJob",
  VerificationJobSchema
);
