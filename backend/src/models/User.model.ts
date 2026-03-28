import mongoose, { Schema, Document } from 'mongoose';

/**
 * User Interface
 * Represents a creator, developer, or platform interacting with StellarProof.
 */
export interface IUser extends Document {
  email: string;               // Primary identifier for Web2 login
  passwordHash: string;        // Hashed password
  
  // Password Reset Flow
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  stellarPublicKey?: string;   // Added later when they connect Freighter wallet
  nonce?: string;              // For SIWE (Sign-In With Ethereum/Stellar) flow if needed later
  role: 'creator' | 'developer' | 'admin';
  apiKeys: string[];           // For developer API access (Phase 2)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't return password in queries by default
      // Contributors: You MUST implement a pre-save hook using bcryptjs 
      // to hash the password before it is saved to the database.
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    stellarPublicKey: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined to be unique, populated when wallet is linked
      index: true,
    },
    nonce: {
      type: String,
      // Optional: Use this if you want to implement wallet-signature based login later
    },
    role: {
      type: String,
      enum: ['creator', 'developer', 'admin'],
      default: 'creator',
    },
    apiKeys: [{
      type: String,
      // Contributors: Implement API key hashing before saving
    }],
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
