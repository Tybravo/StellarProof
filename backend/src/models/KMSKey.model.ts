import mongoose, { Schema, Document } from 'mongoose';

/**
 * KMSKey Interface (Key Management Service)
 * Represents the cryptographic keys used by the SPV to seal and unseal content.
 * 
 * SECURITY WARNING: In a production environment, this should ideally be integrated 
 * with a dedicated KMS like AWS KMS or HashiCorp Vault. For this project, this 
 * model acts as the database representation of those keys.
 */
export interface IKMSKey extends Document {
  creatorId: mongoose.Types.ObjectId;
  keyVersion: string;          // e.g., v1, v2 (for key rotation)
  algorithm: string;           // e.g., AES-256-GCM
  encryptedKeyValue: string;   // The actual symmetric key, encrypted by a master key before saving!
  iv: string;                  // Initialization Vector used during key encryption
  isActive: boolean;
  expiresAt?: Date;            // Optional expiration for time-limited access
  
  createdAt: Date;
  updatedAt: Date;
}

const KMSKeySchema: Schema = new Schema(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    keyVersion: {
      type: String,
      required: true,
      default: 'v1',
    },
    algorithm: {
      type: String,
      required: true,
      default: 'AES-256-GCM',
    },
    encryptedKeyValue: {
      type: String,
      required: true,
      // Contributors: This MUST be the symmetric key that has been encrypted 
      // by a server-side Master Key (stored in .env) before hitting the DB.
    },
    iv: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    }
  },
  { timestamps: true }
);

export default mongoose.model<IKMSKey>('KMSKey', KMSKeySchema);
