/**
 * Domain types for the Verification Job state machine.
 * Shared across all layers: models, services, controllers, and routes.
 */

// ---------------------------------------------------------------------------
// Status enum
// ---------------------------------------------------------------------------

/**
 * All valid lifecycle states a VerificationJob can occupy.
 *
 * State flow (happy path):
 *   pending → processing → tee_verifying → minting → completed
 *
 * Terminal states: completed | failed
 * Any job that reaches a terminal state CANNOT be transitioned further.
 */
export enum VerificationStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  TEE_VERIFYING = "tee_verifying",
  MINTING = "minting",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ---------------------------------------------------------------------------
// Valid transition map
// ---------------------------------------------------------------------------

/**
 * Defines every legal "from → to" transition.
 * Keyed by current status; value is the set of statuses it may move to.
 *
 * Terminal states (completed, failed) map to an empty set –
 * no further transitions are permitted from them.
 */
export const VALID_TRANSITIONS: Readonly<
  Record<VerificationStatus, ReadonlySet<VerificationStatus>>
> = {
  [VerificationStatus.PENDING]: new Set([
    VerificationStatus.PROCESSING,
    VerificationStatus.FAILED,
  ]),
  [VerificationStatus.PROCESSING]: new Set([
    VerificationStatus.TEE_VERIFYING,
    VerificationStatus.FAILED,
  ]),
  [VerificationStatus.TEE_VERIFYING]: new Set([
    VerificationStatus.MINTING,
    VerificationStatus.FAILED,
  ]),
  [VerificationStatus.MINTING]: new Set([
    VerificationStatus.COMPLETED,
    VerificationStatus.FAILED,
  ]),
  [VerificationStatus.COMPLETED]: new Set(),
  [VerificationStatus.FAILED]: new Set(),
} as const;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Shape of a VerificationJob document as stored in MongoDB.
 */
export interface IVerificationJob {
  _id?: string;

  /** Stellar G-address of the user who submitted the job. */
  ownerPublicKey: string;

  /** SHA-256 hex digest of the content being verified. */
  contentHash: string;

  /** Current lifecycle state of the job. */
  status: VerificationStatus;

  // -- TEE attestation data (populated during tee_verifying step) -----------

  /** SHA-256 hex digest of the TEE attestation report. */
  teeAttestationHash?: string;

  /** Hex-encoded Ed25519 signature over the attestation by the oracle provider. */
  teeSignature?: string;

  /** SHA-256 hex digest of the trusted TEE code measurement. */
  codeMeasurementHash?: string;

  // -- Blockchain data (populated during minting step) ----------------------

  /** Stellar/Soroban transaction hash for the on-chain certificate mint. */
  stellarTransactionHash?: string;

  // -- Failure data ---------------------------------------------------------

  /** Human-readable reason set when transitioning to `failed`. */
  errorMessage?: string;

  /** Optional developer-supplied callback URL for async status updates. */
  webhookUrl?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/** Payload for POST /api/v1/verification/jobs */
export interface CreateVerificationJobDTO {
  ownerPublicKey: string;
  contentHash: string;
  webhookUrl?: string;
}

/** Payload for PATCH /api/v1/verification/jobs/:id/status */
export interface UpdateVerificationStatusDTO {
  status: VerificationStatus;
  /** Required when transitioning to `failed`. */
  errorMessage?: string;
  /** TEE attestation hash – supplied when entering `tee_verifying`. */
  teeAttestationHash?: string;
  /** TEE oracle signature – supplied when entering `tee_verifying`. */
  teeSignature?: string;
  /** Trusted TEE code measurement hash – supplied when entering `tee_verifying`. */
  codeMeasurementHash?: string;
  /** Stellar transaction hash – supplied when entering `minting` or `completed`. */
  stellarTransactionHash?: string;
}
/** Standard JSON envelope returned by every endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}
