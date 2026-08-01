/**
 * Domain types for the Global Certificate Search feature.
 *
 * A `SearchResult` represents a verified-or-pending certification record that
 * can be returned from a global search query across the StellarProof network.
 * It is the flatter, list-focused projection of an on-chain
 * `ProvenanceCertificate` suitable for rendering in list views.
 */

export type SearchResultStatus = "verified" | "pending" | "failed";

export interface SearchResult {
  /** Unique certificate / asset id (used to navigate to `/certificate/[id]`). */
  id: string;

  /** Human-readable asset name; falls back to a generic label when absent. */
  name?: string;

  /** Short, optional summary describing the asset. */
  description?: string;

  /** Primary hash to display (e.g. content hash). May be empty for failed mints. */
  hash: string;

  /** Creator / owner wallet address. Stellar accounts start with `G`. */
  creator: string;

  /** ISO 8601 timestamp string for when the asset was minted. */
  mintedAt: string;

  /** Verification status of the asset. */
  status: SearchResultStatus;

  /** Underlying network name (defaults to "Stellar" when omitted). */
  network?: string;

  /** Optional category / tag, e.g. "Image", "Document", "Audio". */
  type?: string;
}
