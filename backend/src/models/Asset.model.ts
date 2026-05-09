import mongoose, { Schema, Document } from 'mongoose';

/**
 * Asset Interface
 */
export interface IAsset extends Document {
  creatorId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;

  // Storage layer details
  storageProvider: 'mongodb' | 'ipfs' | 's3' | 'cloudinary';
  storageReferenceId: string;

  // Encryption details
  isEncrypted: boolean;
  encryptionKeyVersion?: string;
  accessPolicy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema: Schema = new Schema(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ['mongodb', 'ipfs', 's3', 'cloudinary'], 
      required: true,
      default: 'mongodb',
    },
    storageReferenceId: {
      type: String,
      required: true,
      index: true,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    encryptionKeyVersion: {
      type: String,
    },
    accessPolicy: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAsset>('Asset', AssetSchema);
