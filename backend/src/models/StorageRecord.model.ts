import mongoose, { Schema, Document } from 'mongoose';
import { StorageProvider, UploadResult } from '../types/storage.types';

/**
 * Storage Record Interface
 * Persists upload metadata for every file uploaded via the storage orchestrator.
 * Links uploads to users and tracks provider-specific identifiers.
 */
export interface IStorageRecord extends Document {
  userId: mongoose.Types.ObjectId;
  provider: StorageProvider;
  url: string;
  cid?: string;              // IPFS Content ID
  publicId?: string;         // Cloudinary Public ID
  size: number;              // File size in bytes
  mimetype: string;          // MIME type (e.g., image/png)
  originalFilename: string;  // Original uploaded filename
  uploadedAt: Date;
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
      sparse: true, // Only required for IPFS uploads
      index: true,
    },
    publicId: {
      type: String,
      sparse: true, // Only required for Cloudinary uploads
      index: true,
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
  },
  { timestamps: true }
);

export default mongoose.model<IStorageRecord>('StorageRecord', StorageRecordSchema);
