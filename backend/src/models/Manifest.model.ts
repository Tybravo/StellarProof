import mongoose, { Schema, Document } from 'mongoose';

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
      // Contributors: Implement a pre-save hook to calculate the deterministic hash 
      // of the manifest JSON before saving to the database.
    }
  },
  { 
    timestamps: true,
    strict: false // Allows dynamic keys inside metadata
  }
);

export default mongoose.model<IManifest>('Manifest', ManifestSchema);
