/**
 * Domain types for the Manifest service.
 * Manifests are surfaced from SPV records and expose only the fields
 * relevant to a user's manifest history (no encrypted payload).
 */
import type { AccessType } from "./spv.types";

/**
 * Public-facing shape of a manifest entry returned by the list endpoint.
 * The `encryptedPayload` field is intentionally omitted.
 */
export interface IManifestEntry {
  _id: string;
  ownerPublicKey: string;
  contentHash: string;
  manifestHash: string;
  storageId: string;
  accessType: AccessType;
  nftContractAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Validated query parameters for GET /api/v1/manifests */
export interface ListManifestsQuery {
  ownerPublicKey: string;
  /** Maximum number of records to return (1–100, default 20). */
  limit: number;
  /** Number of records to skip for cursor-based pagination (default 0). */
  skip: number;
}

/** Paginated response envelope for the manifest list. */
export interface ManifestListResult {
  manifests: IManifestEntry[];
  total: number;
  limit: number;
  skip: number;
}
