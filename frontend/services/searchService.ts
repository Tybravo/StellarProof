/**
 * Global Certificate Search Service
 * ---------------------------------------------------------------------------
 * API integration layer for the Global Certificate Search page.
 *
 * Data sources (in priority order):
 *   1. StellarProof Backend REST API  →  GET /api/v1/certificates/search
 *      (the backend indexes on-chain Soroban Provenance certificates into
 *       MongoDB, see backend/src/models/Certificate.model.ts)
 *   2. Deterministic mock dataset — used ONLY when no API base URL is
 *      configured, so the UI is fully workable during local development.
 *
 * Error philosophy:
 *   - No API configured  → resolve with mock data (`source: "mock"`).
 *   - API configured but failing → REJECT with `SearchApiError` so the UI can
 *     surface a real error state + retry. We never silently mask a broken API.
 *
 * @module services/searchService
 * @see Issue #377 – Integrate Soroban/Backend Search API for Global Certificate Search
 */

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export type CertificateStatus = "verified" | "pending" | "revoked";
export type StatusFilter = "all" | CertificateStatus;
export type NetworkFilter = "all" | "testnet" | "mainnet";
export type SortOption = "relevance" | "newest" | "oldest";

/** Normalized certificate shape consumed by the List/Grid views. */
export interface SearchCertificate {
  /** Stable React key + route param — always the on-chain certificate id. */
  id: string;
  certificateId: string;
  title: string;
  creator: string;
  creatorId?: string;
  contentHash: string;
  manifestHash: string;
  attestationHash?: string;
  transactionHash?: string;
  contractAddress?: string;
  ledgerSequence?: number;
  network: "testnet" | "mainnet";
  status: CertificateStatus;
  /** ISO-8601 string. */
  mintedAt: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  tags: string[];
}

/** Paginated envelope returned to the page/hook. */
export interface CertificateSearchResult {
  results: SearchCertificate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Where the data came from — surfaced in the UI as a dev hint. */
  source: "api" | "mock";
}

export interface SearchCertificatesParams {
  query: string;
  page?: number;
  limit?: number;
  status?: StatusFilter;
  network?: NetworkFilter;
  sort?: SortOption;
  /** Caller-owned signal so the hook can abort stale requests. */
  signal?: AbortSignal;
  /** Request timeout in ms (default 12000). */
  timeoutMs?: number;
}

/* -------------------------------------------------------------------------- */
/*                                   Errors                                   */
/* -------------------------------------------------------------------------- */

/** Typed error thrown by the search service so the UI can branch on it. */
export class SearchApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly isAbort: boolean;
  readonly isTimeout: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      isAbort?: boolean;
      isTimeout?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "SearchApiError";
    this.status = options.status;
    this.code = options.code;
    this.isAbort = options.isAbort ?? false;
    this.isTimeout = options.isTimeout ?? false;
  }
}

/* -------------------------------------------------------------------------- */
/*                              Environment config                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Resolves the backend base URL.
 * `NEXT_PUBLIC_*` vars must be referenced literally so Next.js can inline them.
 */
export function getApiBaseUrl(): string | null {
  if (typeof process === "undefined") return null;
  const raw =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

/** Explicit opt-in to the mock dataset even when an API URL is present. */
export function isMockSearchForced(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_SEARCH_MOCK === "true";
}

/* -------------------------------------------------------------------------- */
/*                              Response parsing                              */
/* -------------------------------------------------------------------------- */

type RawRecord = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function pick(raw: RawRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function toIsoDate(value: unknown): string {
  if (typeof value === "number") {
    // Soroban ledger timestamps are seconds since epoch.
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(0).toISOString();
}

function toStatus(value: unknown): CertificateStatus {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  if (v === "revoked" || v === "rejected") return "revoked";
  if (v === "pending" || v === "processing") return "pending";
  if (v === "verified" || v === "minted" || v === "complete" || v === "completed") {
    return "verified";
  }
  // A minted on-chain certificate is verified by definition.
  return "verified";
}

function toNetwork(value: unknown): "testnet" | "mainnet" {
  return typeof value === "string" && value.toLowerCase() === "mainnet"
    ? "mainnet"
    : "testnet";
}

function toTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((t): t is string => typeof t === "string" && t.length > 0);
  }
  return [];
}

/**
 * Maps a backend/Soroban certificate record onto the normalized UI shape.
 * Tolerates both the Mongo document shape and the flattened contract shape.
 */
export function normalizeCertificate(raw: RawRecord): SearchCertificate {
  const nestedManifest = (raw.manifestId ?? raw.manifest) as RawRecord | undefined;
  const nestedAsset = (raw.assetId ?? raw.asset) as RawRecord | undefined;
  const manifest = nestedManifest && typeof nestedManifest === "object" ? nestedManifest : {};
  const asset = nestedAsset && typeof nestedAsset === "object" ? nestedAsset : {};
  const metadata =
    manifest.metadata && typeof manifest.metadata === "object"
      ? (manifest.metadata as RawRecord)
      : {};

  const certificateId =
    asString(pick(raw, "certificateId", "certificate_id", "id", "_id")) ?? "";

  const fileName = asString(pick(asset, "fileName", "filename", "name"));

  const title =
    asString(pick(raw, "title", "name")) ??
    asString(pick(metadata, "title", "description")) ??
    fileName ??
    (certificateId ? `Certificate ${certificateId}` : "Untitled certificate");

  return {
    id: certificateId || asString(pick(raw, "_id", "id")) || crypto.randomUUID(),
    certificateId,
    title,
    creator:
      asString(pick(raw, "creator", "owner", "ownerAddress", "creatorAddress")) ??
      asString(pick(manifest, "creator")) ??
      "Unknown creator",
    creatorId: asString(pick(raw, "creatorId", "creator_id")),
    contentHash:
      asString(pick(raw, "contentHash", "content_hash")) ??
      asString(pick(manifest, "contentHash", "content_hash")) ??
      "",
    manifestHash:
      asString(pick(raw, "manifestHash", "manifest_hash")) ??
      asString(pick(manifest, "manifestHash", "manifest_hash")) ??
      "",
    attestationHash: asString(pick(raw, "attestationHash", "attestation_hash")),
    transactionHash: asString(pick(raw, "transactionHash", "transaction_hash", "txHash")),
    contractAddress: asString(pick(raw, "contractAddress", "contract_address")),
    ledgerSequence: asNumber(pick(raw, "ledgerSequence", "ledger_sequence", "ledger")),
    network: toNetwork(pick(raw, "stellarNetwork", "network")),
    status: toStatus(pick(raw, "status", "verificationStatus")),
    mintedAt: toIsoDate(pick(raw, "mintedAt", "minted_at", "timestamp", "createdAt")),
    fileName,
    mimeType: asString(pick(asset, "mimeType", "mime_type")),
    sizeBytes: asNumber(pick(asset, "sizeBytes", "size_bytes", "size")),
    tags: toTags(pick(metadata, "tags")),
  };
}

/**
 * Unwraps the StellarProof API envelope `{ success, data: { ... } }` and the
 * various pagination shapes the backend may return (`skip` or `page`).
 */
export function normalizeSearchPayload(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number
): Omit<CertificateSearchResult, "source"> {
  const root = (payload ?? {}) as RawRecord;
  const data = (root.data ?? root) as RawRecord;

  const rawList =
    (Array.isArray(data.certificates) && data.certificates) ||
    (Array.isArray(data.results) && data.results) ||
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(root.certificates) && root.certificates) ||
    (Array.isArray(root.results) && root.results) ||
    (Array.isArray(data) ? (data as unknown as unknown[]) : []) ||
    [];

  const results = (rawList as unknown[])
    .filter((item): item is RawRecord => typeof item === "object" && item !== null)
    .map(normalizeCertificate);

  const limit = asNumber(pick(data, "limit", "pageSize", "perPage")) ?? fallbackLimit;
  const safeLimit = limit > 0 ? limit : fallbackLimit;

  const skip = asNumber(pick(data, "skip", "offset"));
  const page =
    asNumber(pick(data, "page", "currentPage")) ??
    (skip !== undefined ? Math.floor(skip / safeLimit) + 1 : fallbackPage);

  const total = asNumber(pick(data, "total", "totalCount", "count")) ?? results.length;
  const totalPages =
    asNumber(pick(data, "totalPages", "pages")) ??
    Math.max(1, Math.ceil(total / safeLimit));

  return {
    results,
    total,
    page: page > 0 ? page : 1,
    limit: safeLimit,
    totalPages: totalPages > 0 ? totalPages : 1,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Fetch with timeout                            */
/* -------------------------------------------------------------------------- */

interface TimedFetchResult {
  response: Response;
  timedOut: boolean;
}

async function fetchWithTimeout(
  url: string,
  externalSignal: AbortSignal | undefined,
  timeoutMs: number
): Promise<TimedFetchResult> {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    return { response, timedOut };
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
}

/* -------------------------------------------------------------------------- */
/*                               Public service                               */
/* -------------------------------------------------------------------------- */

/**
 * Executes a global certificate search.
 *
 * Endpoint contract (matches the repo API standard – see
 * `.context/DEVELOPMENT_GUIDELINES.md` → API Standards):
 *
 *   GET {API_BASE}/api/v1/certificates/search
 *       ?q=<string>&page=<n>&limit=<n>&status=<s>&network=<n>&sort=<s>
 *
 *   200 → { success: true, data: { certificates: [...], total, page, limit } }
 *   4xx/5xx → { success: false, error: "..." }
 *
 * @throws {SearchApiError} when a configured API is unreachable or errors.
 */
export async function searchCertificates(
  params: SearchCertificatesParams
): Promise<CertificateSearchResult> {
  const {
    query,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    status = "all",
    network = "all",
    sort = "relevance",
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = params;

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : DEFAULT_PAGE_SIZE;

  const baseUrl = getApiBaseUrl();

  // ── Mock path: no backend configured (local dev) or explicitly forced ──────
  if (!baseUrl || isMockSearchForced()) {
    if (signal?.aborted) {
      throw new SearchApiError("Search request aborted", { isAbort: true });
    }
    return searchMockCertificates({
      query,
      page: safePage,
      limit: safeLimit,
      status,
      network,
      sort,
      signal,
    });
  }

  // ── Real API path ─────────────────────────────────────────────────────────
  const search = new URLSearchParams();
  search.set("q", query.trim());
  search.set("page", String(safePage));
  search.set("limit", String(safeLimit));
  search.set("skip", String((safePage - 1) * safeLimit));
  if (status !== "all") search.set("status", status);
  if (network !== "all") search.set("network", network);
  if (sort !== "relevance") search.set("sort", sort);

  const url = `${baseUrl}/api/v1/certificates/search?${search.toString()}`;

  let response: Response;
  let timedOut = false;

  try {
    const result = await fetchWithTimeout(url, signal, timeoutMs);
    response = result.response;
    timedOut = result.timedOut;
  } catch (err) {
    const name = (err as { name?: string } | undefined)?.name;
    if (name === "AbortError") {
      if (timedOut) {
        throw new SearchApiError(
          "The search request timed out. Please check your connection and try again.",
          { isTimeout: true, code: "SEARCH_TIMEOUT" }
        );
      }
      throw new SearchApiError("Search request aborted", { isAbort: true });
    }
    throw new SearchApiError(
      "Unable to reach the StellarProof API. Please check your connection and try again.",
      { code: "NETWORK_ERROR" }
    );
  }

  if (!response.ok) {
    let message = `Search failed with status ${response.status}.`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as RawRecord;
      const apiError = asString(pick(body, "error", "message"));
      if (apiError) message = apiError;
      code = asString(pick(body, "code", "errorCode"));
    } catch {
      /* non-JSON error body – keep the generic message */
    }
    if (response.status === 404) {
      message = "Certificate search endpoint not found on the API.";
    }
    if (response.status >= 500) {
      message = "The StellarProof API is temporarily unavailable. Please try again.";
    }
    throw new SearchApiError(message, { status: response.status, code });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SearchApiError("Received a malformed response from the API.", {
      status: response.status,
      code: "INVALID_JSON",
    });
  }

  const root = (payload ?? {}) as RawRecord;
  if (root.success === false) {
    throw new SearchApiError(
      asString(pick(root, "error", "message")) ?? "Search request was rejected by the API.",
      { status: response.status }
    );
  }

  const normalized = normalizeSearchPayload(payload, safePage, safeLimit);
  return { ...normalized, source: "api" };
}

/* -------------------------------------------------------------------------- */
/*                               Mock dataset                                 */
/* -------------------------------------------------------------------------- */

const MOCK_DELAY_MS = 450;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Deterministic fixture set used when no backend is configured. */
export const MOCK_CERTIFICATES: SearchCertificate[] = [
  {
    id: "SP-CERT-000148",
    certificateId: "SP-CERT-000148",
    title: "Aurora Over Reykjavík — Master Frame",
    creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
    contentHash: "sha256:9f2c4a7b1e8d05f36a4c9b2e7d1f08a35c6b9e4d2f7a1c8b05e3d6f9a2c4b7e1",
    manifestHash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    attestationHash: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    transactionHash: "3e8f1a9c2b7d4e05f6a3c8b1d9e2f7a4c5b6d8e0f1a2c3b4d5e6f7a8b9c0d1e2",
    contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
    ledgerSequence: 1_284_501,
    network: "mainnet",
    status: "verified",
    mintedAt: daysAgo(2),
    fileName: "aurora-reykjavik-master.raw",
    mimeType: "image/x-adobe-dng",
    sizeBytes: 62_914_560,
    tags: ["photography", "landscape", "camera-signed"],
  },
  {
    id: "SP-CERT-000147",
    certificateId: "SP-CERT-000147",
    title: "Quarterly Investor Report — Q2 2026",
    creator: "GCAABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUU0123456789ABCD",
    contentHash: "sha256:1a5e9c3f7b2d84e06a1c5b9d3e7f2a48c6d0b4e8f1a3c5d7e9f0b2d4a6c8e1f3",
    manifestHash: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    attestationHash: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    transactionHash: "7b2d4e6f8a0c1e3f5a7b9d0c2e4f6a8b1d3e5f7a9c0b2d4e6f8a1c3e5b7d9f0a",
    contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
    ledgerSequence: 1_284_310,
    network: "mainnet",
    status: "verified",
    mintedAt: daysAgo(5),
    fileName: "investor-report-q2-2026.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2_457_600,
    tags: ["document", "finance", "signed"],
  },
  {
    id: "SP-CERT-000146",
    certificateId: "SP-CERT-000146",
    title: "Synthwave Origins — Studio Master",
    creator: "GBBBCCDDEEFFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUU1122334455BCDE",
    contentHash: "sha256:4d8b2f6a0c9e13d57b2f6a0c4e8d1b5f9a3c7e0d2b4f6a8c1e3d5b7f9a0c2e4d",
    manifestHash: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    transactionHash: "9c0e2a4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c",
    contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
    ledgerSequence: 1_283_998,
    network: "testnet",
    status: "pending",
    mintedAt: daysAgo(7),
    fileName: "synthwave-origins-master.wav",
    mimeType: "audio/wav",
    sizeBytes: 104_857_600,
    tags: ["audio", "music", "master"],
  },
  {
    id: "SP-CERT-000145",
    certificateId: "SP-CERT-000145",
    title: "Field Documentary — Raw Cut 04",
    creator: "GCCCDDEEEFFGGHHHIIJJKKLLMMNNOOPPQQRRSSTTUU2233445566CDEF",
    contentHash: "sha256:6f0a2c4e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a",
    manifestHash: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    attestationHash: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    transactionHash: "1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f",
    ledgerSequence: 1_283_640,
    network: "testnet",
    status: "verified",
    mintedAt: daysAgo(11),
    fileName: "field-doc-raw-cut-04.mov",
    mimeType: "video/quicktime",
    sizeBytes: 1_073_741_824,
    tags: ["video", "documentary", "raw"],
  },
  {
    id: "SP-CERT-000144",
    certificateId: "SP-CERT-000144",
    title: "Generative Series #12 — Provenance Bundle",
    creator: "GDDDEEFFFGGHHHIIIJJKKLLMMNNOOPPQQRRSSTTUU3344556677DEFG",
    contentHash: "sha256:8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e",
    manifestHash: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    transactionHash: "5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c",
    contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
    ledgerSequence: 1_282_770,
    network: "mainnet",
    status: "revoked",
    mintedAt: daysAgo(18),
    fileName: "generative-series-12.zip",
    mimeType: "application/zip",
    sizeBytes: 8_388_608,
    tags: ["generative", "ai-disclosed", "bundle"],
  },
  {
    id: "SP-CERT-000143",
    certificateId: "SP-CERT-000143",
    title: "Press Photo — Summit Handshake",
    creator: "GEEEFFFGGHHIIIIJJKKLLMMNNOOPPQQRRSSTTUU4455667788EFGH",
    contentHash: "sha256:0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d",
    manifestHash: "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    attestationHash: "0xa7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
    transactionHash: "2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b",
    ledgerSequence: 1_281_205,
    network: "mainnet",
    status: "verified",
    mintedAt: daysAgo(24),
    fileName: "summit-handshake.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 5_242_880,
    tags: ["photography", "press", "newsroom"],
  },
  {
    id: "SP-CERT-000142",
    certificateId: "SP-CERT-000142",
    title: "Open Source Release — v2.4.0 Artifact",
    creator: "GFFF0001GGHHHIIIJJKKLLMMNNOOPPQQRRSSTTUU5566778899FGHI",
    contentHash: "sha256:3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e",
    manifestHash: "0xb8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9",
    transactionHash: "6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f",
    ledgerSequence: 1_279_884,
    network: "testnet",
    status: "verified",
    mintedAt: daysAgo(31),
    fileName: "release-v2.4.0.tar.gz",
    mimeType: "application/gzip",
    sizeBytes: 15_728_640,
    tags: ["software", "release", "supply-chain"],
  },
  {
    id: "SP-CERT-000141",
    certificateId: "SP-CERT-000141",
    title: "Clinical Dataset Snapshot — Cohort B",
    creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
    contentHash: "sha256:5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b",
    manifestHash: "0xc9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
    attestationHash: "0xd0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1",
    transactionHash: "8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d",
    ledgerSequence: 1_277_012,
    network: "testnet",
    status: "pending",
    mintedAt: daysAgo(44),
    fileName: "cohort-b-snapshot.parquet",
    mimeType: "application/octet-stream",
    sizeBytes: 268_435_456,
    tags: ["dataset", "research", "sealed-vault"],
  },
  {
    id: "SP-CERT-000140",
    certificateId: "SP-CERT-000140",
    title: "Brand Identity Kit — Final Delivery",
    creator: "GDDDEEFFFGGHHHIIIJJKKLLMMNNOOPPQQRRSSTTUU3344556677DEFG",
    contentHash: "sha256:7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e",
    manifestHash: "0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
    transactionHash: "0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a",
    contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
    ledgerSequence: 1_274_330,
    network: "mainnet",
    status: "verified",
    mintedAt: daysAgo(58),
    fileName: "brand-identity-kit.fig",
    mimeType: "application/octet-stream",
    sizeBytes: 41_943_040,
    tags: ["design", "branding", "delivery"],
  },
  {
    id: "SP-CERT-000139",
    certificateId: "SP-CERT-000139",
    title: "Podcast Episode 88 — Unedited Session",
    creator: "GEEEFFFGGHHIIIIJJKKLLMMNNOOPPQQRRSSTTUU4455667788EFGH",
    contentHash: "sha256:9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b",
    manifestHash: "0xf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3",
    transactionHash: "4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e",
    ledgerSequence: 1_271_007,
    network: "testnet",
    status: "verified",
    mintedAt: daysAgo(73),
    fileName: "episode-88-unedited.flac",
    mimeType: "audio/flac",
    sizeBytes: 524_288_000,
    tags: ["audio", "podcast", "unedited"],
  },
  {
    id: "SP-CERT-000138",
    certificateId: "SP-CERT-000138",
    title: "Architectural Render — Tower B Nightfall",
    creator: "GCCCDDEEEFFGGHHHIIJJKKLLMMNNOOPPQQRRSSTTUU2233445566CDEF",
    contentHash: "sha256:2d4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f",
    manifestHash: "0xa3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4",
    attestationHash: "0xb4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
    transactionHash: "8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e",
    ledgerSequence: 1_268_442,
    network: "mainnet",
    status: "verified",
    mintedAt: daysAgo(90),
    fileName: "tower-b-nightfall-8k.png",
    mimeType: "image/png",
    sizeBytes: 94_371_840,
    tags: ["render", "architecture", "3d"],
  },
  {
    id: "SP-CERT-000137",
    certificateId: "SP-CERT-000137",
    title: "Legal Agreement — Distribution Rights",
    creator: "GCAABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUU0123456789ABCD",
    contentHash: "sha256:4f6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a",
    manifestHash: "0xc5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    transactionHash: "1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b",
    ledgerSequence: 1_265_119,
    network: "testnet",
    status: "revoked",
    mintedAt: daysAgo(112),
    fileName: "distribution-rights-agreement.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1_048_576,
    tags: ["document", "legal", "contract"],
  },
  {
    id: "SP-CERT-000136",
    certificateId: "SP-CERT-000136",
    title: "Satellite Capture — Delta Region 07",
    creator: "GFFF0001GGHHHIIIJJKKLLMMNNOOPPQQRRSSTTUU5566778899FGHI",
    contentHash: "sha256:6a8c1e3b5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c",
    manifestHash: "0xd6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
    attestationHash: "0xe7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
    transactionHash: "5d7f9a0c2e4b6d8f1a3c5e7b9d0f2a4c6e8b1d3f5a7c9e0b2d4f6a8c1e3b5d7f",
    contractAddress: "CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K",
    ledgerSequence: 1_261_880,
    network: "mainnet",
    status: "verified",
    mintedAt: daysAgo(140),
    fileName: "delta-region-07.tiff",
    mimeType: "image/tiff",
    sizeBytes: 314_572_800,
    tags: ["satellite", "geospatial", "sensor-signed"],
  },
];

function matchesQuery(cert: SearchCertificate, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    cert.certificateId,
    cert.title,
    cert.creator,
    cert.contentHash,
    cert.manifestHash,
    cert.attestationHash ?? "",
    cert.transactionHash ?? "",
    cert.contractAddress ?? "",
    cert.fileName ?? "",
    cert.network,
    cert.status,
    ...cert.tags,
  ]
    .join(" ")
    .toLowerCase();
  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

/**
 * Client-side stand-in for the backend search endpoint.
 * Mirrors the real API semantics (filter → sort → paginate) so swapping in the
 * live API requires zero UI changes.
 */
export async function searchMockCertificates(
  params: Omit<SearchCertificatesParams, "timeoutMs">
): Promise<CertificateSearchResult> {
  const {
    query,
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    status = "all",
    network = "all",
    sort = "relevance",
    signal,
  } = params;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, MOCK_DELAY_MS);

    function onAbort() {
      clearTimeout(timer);
      reject(new SearchApiError("Search request aborted", { isAbort: true }));
    }

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new SearchApiError("Search request aborted", { isAbort: true }));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });

  const needle = query.trim().toLowerCase();

  const filtered = MOCK_CERTIFICATES.filter(
    (cert) =>
      matchesQuery(cert, needle) &&
      (status === "all" || cert.status === status) &&
      (network === "all" || cert.network === network)
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.mintedAt).getTime() - new Date(b.mintedAt).getTime();
    }
    // "relevance" falls back to newest-first, matching the backend default.
    return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime();
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;

  return {
    results: sorted.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
    source: "mock",
  };
}
