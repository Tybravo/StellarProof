import mongoose, { Schema, Document } from 'mongoose';
import { StorageProvider, StorageRecordKind } from '../types/storage.types';
import type { IpfsAvailability, IpfsPinStatus } from '../types/ipfs.types';

/**
 * Storage Record Interface
 * Persists upload metadata for every file uploaded via the storage orchestrator.
 * Links uploads to users and tracks provider-specific identifiers.
 */
export interface IStorageRecord extends Document {
  userId: mongoose.Types.ObjectId;
  assetId?: mongoose.Types.ObjectId;  // Asset this media/manifest belongs to
  kind: StorageRecordKind;            // 'media' | 'manifest'
  provider: StorageProvider;
  url: string;
  cid?: string;              // IPFS Content ID
  publicId?: string;         // Cloudinary Public ID
  contentHash?: string;      // SHA-256 (hex) of the uploaded bytes
  fallbackFrom?: StorageProvider; // Requested provider when the upload fell back to `provider`
  requestedProvider?: StorageProvider;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  size: number;              // File size in bytes
  mimetype: string;          // MIME type (e.g., image/png)
  originalFilename: string;  // Original uploaded filename
  uploadedAt: Date;
  // IPFS only: pin propagation state and gateway reachability captured at upload time.
  pinningStatus?: IpfsPinStatus;
  availability?: IpfsAvailability;
  createdAt: Date;
  updatedAt: Date;
}

const StorageRecordSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      index: true,
    },
    kind: {
      type: String,
      enum: ['media', 'manifest'],
      required: [true, 'Record kind is required'],
      default: 'media',
      index: true,
    },
    provider: {
      type: String,
      enum: ['cloudinary', 'ipfs'],
      required: [true, 'Storage provider is required'],
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Storage URL is required'],
      unique: true,
      index: true,
    },
    cid: {
      type: String,
      // Content-addressed: identical bytes share a CID, so one record per CID.
      // Sparse so Cloudinary records (no CID) are not indexed.
      unique: true,
      sparse: true,
    },
    publicId: {
      type: String,
      sparse: true, // Only required for Cloudinary uploads
      index: true,
    },
    contentHash: {
      type: String,
      lowercase: true,
      match: [/^[a-f0-9]{64}$/, 'contentHash must be a SHA-256 hex digest'],
      index: true,
    },
    fallbackFrom: {
      type: String,
      enum: ['cloudinary', 'ipfs'],
    },
    requestedProvider: {
      type: String,
      enum: ['cloudinary', 'ipfs'],
    },
    fallbackUsed: {
      type: Boolean,
    },
    fallbackReason: {
      type: String,
      maxlength: 1000,
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
    },
    mimetype: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    pinningStatus: {
      type: String,
      enum: ['pinning', 'pinned'],
      // Only IPFS records report pin state; Cloudinary records leave it unset.
    },
    availability: {
      type: new Schema(
        {
          available: { type: Boolean },
          httpStatus: { type: Number, default: null },
          checkedAt: { type: String },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

// Pre-upload deduplication lookup: identical bytes already pinned to a provider
StorageRecordSchema.index({ contentHash: 1, provider: 1 });

export default mongoose.model<IStorageRecord>('StorageRecord', StorageRecordSchema);
