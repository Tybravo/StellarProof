/**
 * Shared interfaces and types for storage orchestration
 * All storage-related types are defined here for consistency
 */
import type { IpfsAvailability, IpfsPinStatus } from './ipfs.types';
import { AppError } from '../errors/AppError';

export type StorageProvider = 'cloudinary' | 'ipfs';
export const STORAGE_PROVIDERS: readonly StorageProvider[] = ['ipfs', 'cloudinary'];
export type ProviderHealthStatus = 'healthy' | 'unhealthy';

export interface ProviderHealthSnapshot {
  provider: StorageProvider;
  rank: number;
  status: ProviderHealthStatus;
  latencyMs?: number;
  consecutiveFailures: number;
  lastError?: string;
  lastCheckedAt: Date;
  lastHealthyAt?: Date;
  source: 'probe' | 'upload';
}

/** What a stored object represents: raw media bytes or a provenance manifest */
export type StorageRecordKind = 'media' | 'manifest';

export interface UploadRequest {
  storageProvider: StorageProvider;
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  userId: string;
  contentHash?: string;  // Verified SHA-256 hex; computed from the buffer when omitted
  assetId?: string;
  kind?: StorageRecordKind;
  metadata?: Record<string, string>;
  allowFallback?: boolean;
}

export interface UploadResult {
  recordId?: string;
  provider: StorageProvider;          // Provider that actually stored the file
  requestedProvider?: StorageProvider; // Provider the client asked for
  fallbackUsed?: boolean;              // True when the requested provider failed and a fallback stored the file
  failedOver?: boolean;
  url: string;
  cid?: string;          // IPFS only
  publicId?: string;     // Cloudinary only
  fallbackFrom?: StorageProvider; // Requested provider when the upload fell back
  kind?: StorageRecordKind;
  assetId?: string;
  size: number;
  mimetype: string;
  contentHash?: string;  // SHA-256 hex of the stored bytes
  uploadedAt: Date;
  /** True when an existing record was reused instead of pinning the bytes again */
  deduplicated?: boolean;
  /**
   * IPFS only: public gateway URL for the pinned CID. Mirrors `url` for IPFS
   * records so clients have an explicit, provider-named field. Absent for
   * Cloudinary uploads.
   */
  gatewayUrl?: string;
  /**
   * IPFS only: Pinata pin state captured when the upload was accepted.
   * `pinning` means the pin has not propagated yet, so clients should keep
   * the upload in a pending state. Absent for Cloudinary uploads.
   */
  pinningStatus?: IpfsPinStatus;
  /**
   * IPFS only: gateway reachability for the CID, probed before responding.
   * Absent for Cloudinary uploads.
   */
  availability?: IpfsAvailability;
}

/**
 * Outcome of fetching a CID from the IPFS gateway.
 * - ok:          full object was streamed and hashed within the size cap
 * - not_found:   gateway answered 404/410 (not pinned or not yet propagated)
 * - too_large:   object exceeds the configured size cap; content not hashed
 * - timeout:     gateway did not deliver the object within the timeout
 * - unreachable: network failure or unexpected gateway status
 */
export type GatewayFetchStatus = 'ok' | 'not_found' | 'too_large' | 'timeout' | 'unreachable';

export type GatewayFetchResult =
  | { status: 'ok'; size: number; sha256: string }
  | { status: 'too_large'; declaredSize: number | null }
  | { status: 'not_found' | 'timeout' | 'unreachable'; httpStatus?: number };

export interface GatewayFetchOptions {
  timeoutMs: number;
  maxBytes: number;
}

/**
 * Response of GET /api/v1/storage/resolve/:cid
 */
export interface CidResolutionResult {
  cid: string;
  /** True when the gateway serves the object (including objects over the size cap) */
  available: boolean;
  /** Size in bytes reported by the gateway, or null when unknown */
  size: number | null;
  /**
   * True/false when the fetched bytes were hashed and compared with the stored
   * contentHash; null when verification was not possible (object unavailable,
   * over the size cap, or no contentHash stored for the record).
   */
  hashMatches: boolean | null;
  /** Size recorded at upload time (from the StorageRecord) */
  expectedSize: number;
  gatewayStatus: GatewayFetchStatus;
  checkedAt: Date;
}

/**
 * Stored upload that already holds the same content hash
 */
export interface ExistingStorageRecord {
  id: string;
  provider: StorageProvider;
  url: string;
  cid?: string;
  publicId?: string;
  uploadedAt: Date;
}

/**
 * Result of the pre-upload hash-consistency check
 */
export interface ContentHashCheckResult {
  contentHash: string;
  size: number;
  matches: true;
  alreadyStored: boolean;
  existingRecords: ExistingStorageRecord[];
}

/**
 * Base interface for storage provider implementations
 */
export interface IStorageProvider {
  upload(buffer: Buffer, mimetype: string, originalname: string): Promise<UploadResult>;
}

/**
 * Storage errors have provider context.
 * Extends AppError so the global error handler honours the status code
 * instead of collapsing every storage failure into a generic 500.
 */
export class StorageError extends AppError {
  status: 'fail' | 'error';

  constructor(
    public provider: StorageProvider | null,
    public operation: string,
    public reason: string,
    statusCode: number = 500,
  ) {
    super(
      `Storage Error [${provider}/${operation}]: ${reason}`,
      statusCode,
      `STORAGE_${operation.toUpperCase()}_FAILED`,
    );
    this.name = 'StorageError';
    this.status = statusCode < 500 ? 'fail' : 'error';
    // AppError pins the prototype to AppError; restore it for `instanceof StorageError`.
    Object.setPrototypeOf(this, StorageError.prototype);
  }
}
