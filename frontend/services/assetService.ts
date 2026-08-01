/**
 * Data service layer for Digital Products / Assets.
 *
 * Provides typed access to a user's verified digital assets (images, videos and
 * other media authenticated on the Stellar blockchain). The functions here are
 * the single integration point for asset retrieval, so UI components never talk
 * to the transport layer directly.
 *
 * The implementation currently returns mocked data with simulated latency. When
 * the backend endpoint is available, only the internals of `requestAssets` need
 * to change; the exported types and function signatures form the stable
 * contract consumed by the UI.
 */

/** Kind of digital asset a user can own and verify. */
export type AssetType = "image" | "video" | "audio" | "document" | "model";

/** Verification lifecycle state of an asset on-chain. */
export type AssetStatus = "verified" | "pending" | "revoked";

/** A single verified digital product / asset owned by a user. */
export interface Asset {
  /** Stable unique identifier. */
  id: string;
  /** Human-readable asset title. */
  title: string;
  /** Media category of the asset. */
  type: AssetType;
  /** URL of the display thumbnail. */
  thumbnailUrl: string;
  /** Current verification status. */
  status: AssetStatus;
  /** SHA-256 content hash committed on-chain. */
  contentHash: string;
  /** ISO-8601 timestamp of when the asset was created / minted. */
  createdAt: string;
  /** Byte size of the underlying file, when known. */
  fileSize?: number;
}

/** Options accepted by {@link fetchAssets}. */
export interface FetchAssetsOptions {
  /** Owner's Stellar public key. Reserved for the real backend query. */
  publicKey?: string;
  /** Restrict results to a single asset type. */
  type?: AssetType;
  /** Restrict results to a single verification status. */
  status?: AssetStatus;
  /** Abort signal to cancel an in-flight request. */
  signal?: AbortSignal;
}

/** Successful/failed result wrapper returned by {@link fetchAssets}. */
export type FetchAssetsResult =
  | { data: Asset[]; error?: undefined }
  | { data?: undefined; error: string };

const MOCK_ASSETS: Asset[] = [
  {
    id: "asset-001",
    title: "Sunset Over the Serengeti",
    type: "image",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&h=300&fit=crop",
    status: "verified",
    contentHash:
      "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    fileSize: 4_812_544,
  },
  {
    id: "asset-002",
    title: "Product Launch Teaser",
    type: "video",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=300&fit=crop",
    status: "verified",
    contentHash:
      "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    fileSize: 128_004_096,
  },
  {
    id: "asset-003",
    title: "Ambient Studio Session",
    type: "audio",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop",
    status: "pending",
    contentHash:
      "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    fileSize: 9_764_864,
  },
  {
    id: "asset-004",
    title: "Whitepaper v2 (Final)",
    type: "document",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop",
    status: "verified",
    contentHash:
      "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    fileSize: 2_097_152,
  },
  {
    id: "asset-005",
    title: "Character Rig — Nyx",
    type: "model",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop",
    status: "revoked",
    contentHash:
      "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
    fileSize: 57_671_680,
  },
  {
    id: "asset-006",
    title: "Golden Hour Portrait Series",
    type: "image",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop",
    status: "verified",
    contentHash:
      "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    fileSize: 6_291_456,
  },
];

/** Simulated network round-trip in milliseconds. */
const MOCK_LATENCY_MS = 500;

/**
 * Low-level transport call. Replace the body with a real `fetch` to the backend
 * assets endpoint once available. Kept separate so filtering and typing logic in
 * {@link fetchAssets} stays stable across the mock/real transition.
 */
async function requestAssets(options: FetchAssetsOptions): Promise<Asset[]> {
  const { signal } = options;

  return new Promise<Asset[]>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(MOCK_ASSETS);
    }, MOCK_LATENCY_MS);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Fetch the authenticated user's digital assets.
 *
 * Errors are captured and returned in the result object rather than thrown, so
 * callers can render an error state without a surrounding try/catch. Aborts are
 * re-thrown so callers can distinguish an intentional cancellation from a real
 * failure.
 */
export async function fetchAssets(
  options: FetchAssetsOptions = {},
): Promise<FetchAssetsResult> {
  try {
    const assets = await requestAssets(options);

    const filtered = assets.filter((asset) => {
      if (options.type && asset.type !== options.type) return false;
      if (options.status && asset.status !== options.status) return false;
      return true;
    });

    return { data: filtered };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load assets. Please try again.";
    return { error: message };
  }
}

/**
 * Fetch a single asset by id. Returns `null` when no asset matches.
 */
export async function fetchAssetById(
  id: string,
  options: Omit<FetchAssetsOptions, "type" | "status"> = {},
): Promise<Asset | null> {
  const assets = await requestAssets(options);
  return assets.find((asset) => asset.id === id) ?? null;
}
