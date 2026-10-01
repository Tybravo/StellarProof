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
 *   pending -> processing -> tee_verifying -> minting -> completed
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

export enum VerificationWebhookEvent {
  COMPLETED = "verification.completed",
  FAILED = "verification.failed",
  MINTED = "certificate.minted",
}

export type VerificationTimelineActor = "worker" | "oracle" | "user";

// ---------------------------------------------------------------------------
// Valid transition map
// ---------------------------------------------------------------------------

/**
 * Defines every legal "from -> to" transition.
 * Keyed by current status; value is the set of statuses it may move to.
 *
 * Terminal states (completed, failed) map to an empty set -
 * no further transitions are permitted from them.
 */
export const VALID_TRANSITIONS: Readonly<Record<VerificationStatus, ReadonlySet<VerificationStatus>>> = {
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
// Timeline
// ---------------------------------------------------------------------------

/**
 * A single append-only timeline event, recorded every time a job enters
 * a new lifecycle stage. Powers the frontend progress stepper
 * (Requested -> SPV Processing -> Attested -> Minted).
 */
export interface ITimelineEntry {
  /** The stage the job entered. */
  stage: VerificationStatus;
  /** When the job entered this stage. */
  at: Date;
  /** Component or user responsible for the transition. */
  actor: VerificationTimelineActor;
  /** Stellar transaction hash, present only for on-chain stages (e.g. minting). */
  txHash?: string;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Shape of a VerificationJob document as stored in MongoDB.
 */
export interface IVerificationJob {
  _id?: string;

  /** Manifest and asset submitted for this verification run. */
  manifestId?: string;
  assetId?: string;

  /** Stellar G-address of the user who submitted the job. */
  ownerPublicKey: string;

  /** SHA-256 hex digest of the content being verified. */
  contentHash: string;

  /** Correlation identifiers emitted by the Oracle and Provenance contracts. */
  manifestHash?: string;
  requestId?: string;

  /** Current lifecycle state of the job. */
  status: VerificationStatus;

  /** Append-only history of every stage this job has passed through. */
  timeline: ITimelineEntry[];

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
  /** Transaction that emitted the accepted attestation event. */
  attestationTransactionHash?: string;
  /** Certificate identifier returned by the Provenance contract. */
  certificateId?: string;

  // -- Failure data ---------------------------------------------------------

  /** Human-readable reason set when transitioning to `failed`. */
  errorMessage?: string;

  /** Optional developer-supplied callback URL for async status updates. */
  webhookUrl?: string;
  /** Event types subscribed to by the job's webhook endpoint. */
  webhookEvents?: VerificationWebhookEvent[];

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
  manifestHash?: string;
  requestId?: string;
  webhookUrl?: string;
  webhookEvents?: VerificationWebhookEvent[];
}

/** Payload for PATCH /api/v1/verification/jobs/:id/status */
export interface UpdateVerificationStatusDTO {
  status: VerificationStatus;
  /** Required when transitioning to `failed`. */
  errorMessage?: string;
  /** TEE attestation hash - supplied when entering `tee_verifying`. */
  teeAttestationHash?: string;
  /** TEE oracle signature - supplied when entering `tee_verifying`. */
  teeSignature?: string;
  /** Trusted TEE code measurement hash - supplied when entering `tee_verifying`. */
  codeMeasurementHash?: string;
  /** Stellar transaction hash - supplied when entering `minting` or `completed`. */
  stellarTransactionHash?: string;
  certificateId?: string;
}
/** Standard JSON envelope returned by every endpoint. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

/** Query for GET /api/v1/verification/jobs */
export interface ListVerificationJobsQuery {
  ownerPublicKey: string;
  status?: VerificationStatus;
  dateFrom?: string;
  dateTo?: string;
  contentHash?: string;
  limit: number;
  skip: number;
}

export interface ListVerificationJobsResult {
  jobs: IVerificationJob[];
  total: number;
  limit: number;
  skip: number;
}

export interface JobStatusCounts {
  pending: number;
  processing: number;
  tee_verifying: number;
  minting: number;
  completed: number;
  failed: number;
}

export interface JobTrendBucket {
  /** UTC day, YYYY-MM-DD. */
  bucket: string;
  counts: JobStatusCounts;
  total: number;
}

/** Payload for GET /api/v1/verification/jobs/stats */
export interface JobStats {
  counts: JobStatusCounts;
  total: number;
  /** completed / (completed + failed). 0 when no job has reached a terminal state. */
  successRate: number;
  trends: JobTrendBucket[];
}

/** Payload for POST /api/v1/verification/jobs/oracle/callback */
export interface OracleCallbackDTO {
  jobId: string; // MongoDB ObjectId of the VerificationJob
  teeAttestationHash: string; // SHA-256 hex digest
  teeSignature: string; // Oracle signature (hex/base64 string)
}

// ---------------------------------------------------------------------------
// SSE Types
// ---------------------------------------------------------------------------

/** Status event payload sent to SSE subscribers. */
export interface StatusEventPayload {
  jobId: string;
  status: VerificationStatus;
  ownerPublicKey: string;
  contentHash: string;
  teeAttestationHash: string | null;
  stellarTransactionHash: string | null;
  errorMessage: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}
