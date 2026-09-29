import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * TEEConfig Interface
 * Represents the trusted code measurement configuration used in TEE attestations.
 * The code measurement hash is a SHA-256 hash of the worker + enclave binary,
 * and is used to validate TEE attestations on-chain.
 */
export interface ITEEConfig extends Document {
  // Primary identifier for this TEE configuration
  name: string;
  description?: string;

  // The trusted code measurement hash (SHA-256)
  // This is the hash of the worker + enclave binary used in attestations
  codeMeasurementHash: string;

  // Individual binary hashes for audit trail
  workerBinaryHash?: string;
  enclaveBinaryHash?: string;

  // Environment and version tracking
  version: string;
  environment: 'testnet' | 'mainnet' | 'development';
  
  // Status tracking
  isActive: boolean;
  isDeprecated: boolean;
  
  // Audit fields
  createdBy?: mongoose.Types.ObjectId; // Reference to User who created this
  activatedAt?: Date;
  deprecatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const TEEConfigSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'TEE config name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    codeMeasurementHash: {
      type: String,
      required: [true, 'Code measurement hash is required'],
      match: [/^[a-f0-9]{64}$/i, 'Code measurement hash must be a valid SHA-256 hex string (64 characters)'],
      index: true,
      unique: true,
    },
    workerBinaryHash: {
      type: String,
      match: [/^[a-f0-9]{64}$/i, 'Worker binary hash must be a valid SHA-256 hex string (64 characters)'],
    },
    enclaveBinaryHash: {
      type: String,
      match: [/^[a-f0-9]{64}$/i, 'Enclave binary hash must be a valid SHA-256 hex string (64 characters)'],
    },
    version: {
      type: String,
      required: [true, 'Version is required'],
      trim: true,
    },
    environment: {
      type: String,
      enum: ['testnet', 'mainnet', 'development'],
      required: [true, 'Environment is required'],
      default: 'testnet',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeprecated: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    activatedAt: {
      type: Date,
    },
    deprecatedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
TEEConfigSchema.index({ environment: 1, isActive: 1 });
TEEConfigSchema.index({ environment: 1, isDeprecated: 1 });

// Pre-save hook: validate business logic
TEEConfigSchema.pre<ITEEConfig>('save', async function (next) {
  try {
    // If marking as active, set activatedAt
    if (this.isActive && !this.activatedAt) {
      this.activatedAt = new Date();
    }

    // If marking as deprecated, set deprecatedAt
    if (this.isDeprecated && !this.deprecatedAt) {
      this.deprecatedAt = new Date();
    }

    // Validate: cannot be both active and deprecated
    if (this.isActive && this.isDeprecated) {
      throw new Error('A TEE config cannot be both active and deprecated');
    }

    next();
  } catch (err: any) {
    next(err);
  }
});

/**
 * Static method: Compute code measurement hash from binary data
 * SHA-256 hash of concatenated worker and enclave binaries
 */
TEEConfigSchema.statics.computeCodeMeasurementHash = function (
  workerBinary: Buffer,
  enclaveBinary: Buffer
): string {
  const combined = Buffer.concat([workerBinary, enclaveBinary]);
  return crypto.createHash('sha256').update(combined).digest('hex');
};

/**
 * Static method: Compute individual binary hashes
 */
TEEConfigSchema.statics.computeBinaryHash = function (binary: Buffer): string {
  return crypto.createHash('sha256').update(binary).digest('hex');
};

export default mongoose.model<ITEEConfig>('TEEConfig', TEEConfigSchema);
