import mongoose, { Schema, Document } from 'mongoose';

/**
 * VerificationJob Interface
 * Tracks the lifecycle of a verification request from off-chain storage
 * through the TEE Oracle to on-chain Soroban certification.
 */
export interface IVerificationJob extends Document {
  creatorId: mongoose.Types.ObjectId;  // User who initiated
  assetId: mongoose.Types.ObjectId;    // The media asset being verified
  manifestId: mongoose.Types.ObjectId; // The manifest associated with the asset
  status: 'pending' | 'processing' | 'tee_verifying' | 'minting' | 'completed' | 'failed';
  
  // TEE Specific Data (Populated by Oracle Worker)
  teeAttestationHash?: string;
  teeSignature?: string;
  codeMeasurementHash?: string;
  
  // Blockchain Data
  stellarTransactionHash?: string; // The tx hash where the Soroban contract was called
  
  errorMessage?: string;
  webhookUrl?: string;             // Optional callback for developers
  createdAt: Date;
  updatedAt: Date;
}

const VerificationJobSchema: Schema = new Schema(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    manifestId: {
      type: Schema.Types.ObjectId,
      ref: 'Manifest',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'tee_verifying', 'minting', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    teeAttestationHash: {
      type: String,
      // Populated once TEE Enclave returns result
    },
    teeSignature: {
      type: String,
    },
    codeMeasurementHash: {
      type: String,
    },
    stellarTransactionHash: {
      type: String,
      // Populated once the Soroban contract mints the certificate
    },
    errorMessage: {
      type: String,
    },
    webhookUrl: {
      type: String,
      // For Developer Proof-as-a-Service APIs
    }
  },
  { timestamps: true }
);

export default mongoose.model<IVerificationJob>('VerificationJob', VerificationJobSchema);
