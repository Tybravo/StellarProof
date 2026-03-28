import mongoose, { Schema, Document } from 'mongoose';

/**
 * Asset Interface
 * Represents the physical media file stored either in MongoDB (GridFS/Buffer) or IPFS.
 * Includes encryption metadata for the StellarProof KMS.
 */
export interface IAsset extends Document {
  creatorId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  
  // Storage layer details
  storageProvider: 'mongodb' | 'ipfs' | 's3';
  storageReferenceId: string; // CID for IPFS, Object ID for MongoDB, etc.
  
  // Encryption details (StellarProof KMS)
  isEncrypted: boolean;
  encryptionKeyVersion?: string; // Links to the specific key used in KMS
  accessPolicy?: string;         // Defines who can request decryption
  
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
      enum: ['mongodb', 'ipfs', 's3'],
      required: true,
      default: 'mongodb',
    },
    storageReferenceId: {
      type: String,
      required: true,
      index: true,
      // Contributors: If using IPFS, this will be the CID. 
      // If MongoDB, this might be a GridFS bucket ID.
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    encryptionKeyVersion: {
      type: String,
      // Required if isEncrypted is true
    },
    accessPolicy: {
      type: String,
      // e.g. "public", "private", "nft_holders_only"
    }
  },
  { timestamps: true }
);

export default mongoose.model<IAsset>('Asset', AssetSchema);
