import type { AttestationPage, AttestationRecord } from "./attestationHistory";

/** Minted attestation, i.e. one that has a Provenance Certificate. */
export type MintedCertificateRecord = AttestationRecord & {
  status: "minted";
  certificateId: string;
};

const PAGE_SIZE = 100;
/** Upper bound on pages followed, to guard against a misbehaving cursor loop. */
const MAX_PAGES = 50;

/**
 * Loads every minted certificate for an owner from `GET /api/attestations`,
 * following the cursor until the history is exhausted.
 *
 * Throws an Error with a user-presentable message on any failure.
 */
export async function fetchMintedCertificates(
  ownerAddress: string,
  signal?: AbortSignal
): Promise<MintedCertificateRecord[]> {
  const out: MintedCertificateRecord[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      owner: ownerAddress,
      status: "minted",
      limit: String(PAGE_SIZE),
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/attestations?${params.toString()}`, { signal });
    if (!res.ok) {
      let message = "Unable to load your certificates. Please try again.";
      try {
        const body = await res.json();
        if (typeof body?.error?.message === "string") message = body.error.message;
      } catch {
        // Non-JSON error body: keep the generic message.
      }
      throw new Error(message);
    }

    const body = (await res.json()) as AttestationPage;
    for (const record of body.data) {
      if (record.status === "minted" && record.certificateId) {
        out.push(record as MintedCertificateRecord);
      }
    }
    cursor = body.pagination.nextCursor;
    if (!cursor) break;
  }

  return out;
}
