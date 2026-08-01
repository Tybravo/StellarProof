import type { SearchResult } from "../types";

/**
 * Mock dataset used by the Global Certificate Search results UI while the
 * on-chain indexer is under development. Replace `searchCertificates()` with
 * a live oracle / indexer call once the registry backend is wired up.
 */
const MOCK_RESULTS: SearchResult[] = [
  {
    id: "cert-aurora-001",
    name: "Aurora — Limited Edition Album",
    description: "Limited release album with full ownership verified on-chain.",
    hash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
    creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
    mintedAt: "2025-01-12T10:42:00Z",
    status: "verified",
    type: "Audio",
  },
  {
    id: "cert-3d-print-002",
    name: "Industrial 3D Print STL Pack",
    description: "STL files for 3D printing with authenticity verified on blockchain.",
    hash: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1",
    creator: "GABXFFYHSZOGVKCW3YSXAOZZKFN5HGCMRHSNKGZLPM3KCRQZZFU2XJNC",
    mintedAt: "2025-02-04T18:15:00Z",
    status: "verified",
    type: "3D Model",
  },
  {
    id: "cert-painting-003",
    name: "Genesis — Original Painting",
    description: "Original physical artwork with on-chain provenance record.",
    hash: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
    creator: "GDQP2KPQGKIHYMV727FKZ5XZ7Y7Q3O3F2K3Z3JJQNZQFCK4LVNXJKJLE",
    mintedAt: "2025-02-21T12:00:00Z",
    status: "pending",
    type: "Image",
  },
  {
    id: "cert-text-004",
    name: "Independent Journalism Report",
    description: "Long-form investigative article with cryptographic fingerprint.",
    hash: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3",
    creator: "GCXFGHG4FOEZHK4YQYHZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQX",
    mintedAt: "2024-12-30T09:30:00Z",
    status: "verified",
    type: "Document",
  },
  {
    id: "cert-audio-005",
    name: "Field Recording — Mountain Pass",
    description: "High-fidelity nature recording with IPFS-backed proof.",
    hash: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4",
    creator: "GCNZG3VQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJG",
    mintedAt: "2025-03-02T07:10:00Z",
    status: "verified",
    type: "Audio",
  },
  {
    id: "cert-photo-006",
    name: "Wedding Photography Series",
    description: "Photo set with creator signature certificate.",
    hash: "",
    creator: "GDFFGHG4FOEZHK4YQYHZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQX",
    mintedAt: "2025-03-15T22:00:00Z",
    status: "failed",
    type: "Image",
  },
  {
    id: "cert-video-007",
    name: "Short Film — Northern Lights",
    description: "Award-winning short film, content hash anchored on Stellar.",
    hash: "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
    creator: "GBQQXGCM3XKZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJGZQXJ",
    mintedAt: "2025-03-25T15:45:00Z",
    status: "verified",
    type: "Video",
  },
];

/**
 * Simulated network delay (ms) used while the real indexer is offline.
 */
const MOCK_LATENCY_MS = 600;

/**
 * Returns the full mock dataset. Will be replaced by a backend indexer call.
 */
export async function fetchAllCertificates(): Promise<SearchResult[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return MOCK_RESULTS;
}

/**
 * Mock search across the certificate index. Performs a case-insensitive
 * match against id, name, description, creator and hash. Returns an
 * empty array when no rows match.
 */
export async function searchCertificates(
  query: string,
): Promise<SearchResult[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return MOCK_RESULTS;

  return MOCK_RESULTS.filter((item) => {
    return (
      item.id.toLowerCase().includes(trimmed) ||
      (item.name?.toLowerCase().includes(trimmed) ?? false) ||
      (item.description?.toLowerCase().includes(trimmed) ?? false) ||
      item.creator.toLowerCase().includes(trimmed) ||
      item.hash.toLowerCase().includes(trimmed)
    );
  });
}
