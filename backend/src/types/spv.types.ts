/**
 * Domain types for the SPV (Stellar Proof Verification) service.
 * Shared across all layers: models, services, controllers, and routes.
 */

/** Access control modes supported by an SPV record. */
export type AccessType = "public" | "private" | "nft_holders_only";

/**
 * Shape of an SPV record as stored in MongoDB.
 * The `_id` field is added by Mongoose at persistence time.
 */
export interface ISPVRecord {
  _id?: string;
  /** Stellar G-address of the record creator / owner. */
  ownerPublicKey: string;
  /** SHA-256 hex digest of the original content. */
  contentHash: string;
  /** SHA-256 hex digest of the attached manifest. */
  manifestHash: string;
  /** AES-GCM ciphertext of the content hash, base64-encoded. */
  encryptedPayload: string;
  /** IPFS CID or MongoDB ObjectId referencing the off-chain storage entry. */
  storageId: string;
  /** Who may request decryption of this record. */
  accessType: AccessType;
  /**
   * Soroban contract C-address of the NFT collection.
   * Required when `accessType === 'nft_holders_only'`.
   */
  nftContractAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Payload for POST /api/v1/spv/records */
export interface CreateSPVRecordDTO {
  ownerPublicKey: string;
  contentHash: string;
  manifestHash: string;
  encryptedPayload: string;
  storageId: string;
  accessType: AccessType;
  nftContractAddress?: string;
}

/** Payload for POST /api/v1/spv/records/:id/decrypt */
export interface DecryptRequestDTO {
  stellarPublicKey: string;
}

/** Standard JSON envelope returned by every endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Internal result of the Stellar NFT ownership check. */
export interface NFTOwnershipResult {
  holdsToken: boolean;
  /** String representation of the raw on-chain balance (may be large bigint). */
  balance: string;
}
