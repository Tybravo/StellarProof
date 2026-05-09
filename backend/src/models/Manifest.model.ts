import mongoose, { Schema, Document } from 'mongoose';
import { generateDeterministicHash } from '../utils/crypto';

/**
 * Manifest Interface
 * Based on the StellarProof README manifest schema design.
 * Stores the metadata related to a specific piece of digital media.
 */
export interface IManifest extends Document {
  contentHash: string;           // e.g. sha256:...
  creator: string;               // Stellar Public Key
  creatorId: mongoose.Types.ObjectId; // Reference to User model
  timestamp: Date;               // When the content was created
  metadata: {
    device?: string;
    location?: string;
    aiModel?: string;
    description?: string;
    tags?: string[];
    [key: string]: any;          // Allow arbitrary additional metadata
  };
  manifestHash?: string;         // The hash of this entire manifest document
  createdAt: Date;
  updatedAt: Date;
}

const ManifestSchema: Schema = new Schema(
  {
    contentHash: {
      type: String,
      required: true,
      index: true,
    },
    creator: {
      type: String,
      required: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    metadata: {
      device: String,
      location: String,
      aiModel: String,
      description: String,
      tags: [String],
    },
    manifestHash: {
      type: String,
      unique: true,
      sparse: true,
    }
  },
  { 
    timestamps: true,
    strict: false // Allows dynamic keys inside metadata
  }
);

// --- Pre-save hook for deterministic hashing ---
ManifestSchema.pre<IManifest>('save', function (next) {
  // Only recalculate the hash if relevant content fields have been modified
  if (
    this.isModified('contentHash') ||
    this.isModified('creator') ||
    this.isModified('creatorId') ||
    this.isModified('timestamp') ||
    this.isModified('metadata')
  ) {
    try {
      // Construct the payload to hash. 
      // We explicitly exclude _id, __v, createdAt, and updatedAt 
      // so the hash is purely based on the core business data.
      const payloadToHash = {
        contentHash: this.contentHash,
        creator: this.creator,
        creatorId: this.creatorId ? this.creatorId.toString() : undefined,
        timestamp: this.timestamp ? this.timestamp.toISOString() : undefined,
        metadata: this.metadata || {},
      };

      this.manifestHash = generateDeterministicHash(payloadToHash);
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

export default mongoose.model<IManifest>('Manifest', ManifestSchema);