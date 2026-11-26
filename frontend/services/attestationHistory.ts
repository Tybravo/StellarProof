/**
 * Attestation history data layer.
 *
 * Single integration point for the "SPV attestation history" shown on the
 * user dashboard. The backend does not expose a history endpoint yet, so this
 * module serves deterministic sample records. When the endpoint ships, only
 * `loadRecords` needs to change; the exported types and `getAttestationHistory`
 * signature are the stable contract used by `app/api/attestations/route.ts`.
 */

export type AttestationStatus = "pending" | "attested" | "minted" | "failed";

export const ATTESTATION_STATUSES: readonly AttestationStatus[] = [
  "pending",
  "attested",
  "minted",
  "failed",
];

export interface AttestationRecord {
  id: string;
  ownerAddress: string;
  status: AttestationStatus;
  /** ISO-8601 timestamp the attestation was recorded. */
  attestedAt: string;
  contentHash: string;
  manifestHash: string;
  attestationHash: string;
  /** Present once the certificate has been minted. */
  certificateId?: string;
  /** Soroban transaction hash of the mint, when minted. */
  txHash?: string;
}

export interface AttestationQuery {
  ownerAddress: string;
  status?: AttestationStatus;
  /** Page size, clamped to [1, MAX_LIMIT]. */
  limit?: number;
  /** Opaque cursor: the id of the last record on the previous page. */
  cursor?: string;
}

export interface AttestationPage {
  data: AttestationRecord[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
}

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Stellar account public key: "G" followed by 55 base32 characters. */
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

export function isValidStellarAddress(value: string): boolean {
  return STELLAR_ADDRESS_RE.test(value);
}

export function isAttestationStatus(value: string): value is AttestationStatus {
  return (ATTESTATION_STATUSES as readonly string[]).includes(value);
}

export class InvalidCursorError extends Error {
  constructor() {
    super("cursor does not match any record in the result set");
    this.name = "InvalidCursorError";
  }
}

/** Owner address that has sample data, for local development and tests. */
export const SAMPLE_OWNER_ADDRESS =
  "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const hex = (seed: string): string => `0x${seed.repeat(64).slice(0, 64)}`;

const SAMPLE_RECORDS: AttestationRecord[] = [
  {
    id: "att-0005",
    ownerAddress: SAMPLE_OWNER_ADDRESS,
    status: "pending",
    attestedAt: "2026-11-20T09:15:00Z",
    contentHash: hex("5a"),
    manifestHash: hex("5b"),
    attestationHash: hex("5c"),
  },
  {
    id: "att-0004",
    ownerAddress: SAMPLE_OWNER_ADDRESS,
    status: "minted",
    attestedAt: "2026-10-30T16:40:00Z",
    contentHash: hex("4a"),
    manifestHash: hex("4b"),
    attestationHash: hex("4c"),
    certificateId: "cert-demo-003",
    txHash: hex("4d"),
  },
  {
    id: "att-0003",
    ownerAddress: SAMPLE_OWNER_ADDRESS,
    status: "failed",
    attestedAt: "2026-09-12T11:05:00Z",
    contentHash: hex("3a"),
    manifestHash: hex("3b"),
    attestationHash: hex("3c"),
  },
  {
    id: "att-0002",
    ownerAddress: SAMPLE_OWNER_ADDRESS,
    status: "minted",
    attestedAt: "2026-08-01T08:12:00Z",
    contentHash: hex("2a"),
    manifestHash: hex("2b"),
    attestationHash: hex("2c"),
    certificateId: "cert-demo-002",
    txHash: hex("2d"),
  },
  {
    id: "att-0001",
    ownerAddress: SAMPLE_OWNER_ADDRESS,
    status: "minted",
    attestedAt: "2026-06-21T14:45:00Z",
    contentHash: hex("1a"),
    manifestHash: hex("1b"),
    attestationHash: hex("1c"),
    certificateId: "cert-demo-001",
    txHash: hex("1d"),
  },
];

async function loadRecords(): Promise<AttestationRecord[]> {
  // Replace with the real backend/indexer call once it is deployed.
  return SAMPLE_RECORDS;
}

/**
 * Returns the owner's attestation history, newest first, with cursor
 * pagination. Throws `InvalidCursorError` for a cursor that is not in the
 * filtered result set.
 */
export async function getAttestationHistory(
  query: AttestationQuery
): Promise<AttestationPage> {
  const limit = Math.min(
    Math.max(Math.trunc(query.limit ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT
  );

  const all = (await loadRecords())
    .filter((r) => r.ownerAddress === query.ownerAddress)
    .filter((r) => !query.status || r.status === query.status)
    .sort((a, b) => Date.parse(b.attestedAt) - Date.parse(a.attestedAt));

  let start = 0;
  if (query.cursor) {
    const idx = all.findIndex((r) => r.id === query.cursor);
    if (idx === -1) throw new InvalidCursorError();
    start = idx + 1;
  }

  const data = all.slice(start, start + limit);
  const hasMore = start + limit < all.length;

  return {
    data,
    pagination: {
      limit,
      total: all.length,
      nextCursor: hasMore ? data[data.length - 1].id : null,
    },
  };
}
