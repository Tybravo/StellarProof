/**
 * Mongoose model for SPV (Stellar Proof Verification) records.
 *
 * Schema design decisions:
 * - `contentHash` is unique: prevents duplicate proof records for the same content.
 * - `ownerPublicKey` is indexed: efficient lookups by creator.
 * - `nftContractAddress` is optional at schema level; the service layer enforces
 *   its presence when `accessType === 'nft_holders_only'`.
 * - Timestamps are enabled via Mongoose options (adds `createdAt` / `updatedAt`).
 */
import { Schema, model, Document } from "mongoose";
import type { ISPVRecord, AccessType } from "../types/spv.types";

const ACCESS_TYPES: AccessType[] = ["public", "private", "nft_holders_only"];

export type SPVDocument = ISPVRecord & Document;

const SPVSchema = new Schema<SPVDocument>(
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
      unique: true,
      trim: true,
    },
    manifestHash: {
      type: String,
      required: [true, "manifestHash is required"],
      trim: true,
    },
    encryptedPayload: {
      type: String,
      required: [true, "encryptedPayload is required"],
    },
    storageId: {
      type: String,
      required: [true, "storageId is required"],
      trim: true,
    },
    accessType: {
      type: String,
      required: [true, "accessType is required"],
      enum: {
        values: ACCESS_TYPES,
        message: `accessType must be one of: ${ACCESS_TYPES.join(", ")}`,
      },
    },
    nftContractAddress: {
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

export const SPVModel = model<SPVDocument>("SPVRecord", SPVSchema);
