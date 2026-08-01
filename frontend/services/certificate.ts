export interface ProvenanceCertificate {
  id: string;
  ownerAddress: string;
  mintedAt: string;
  manifestHash: string;
  contentHash: string;
  attestationHash: string;
}

type CertificateResult =
  | { data: ProvenanceCertificate; error?: undefined }
  | { data?: undefined; error: string };

const MOCK_CERTIFICATES: Record<string, ProvenanceCertificate> = {
  "cert-demo-001": {
    id: "cert-demo-001",
    ownerAddress: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
    mintedAt: "2024-11-15T10:30:00Z",
    manifestHash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    contentHash: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
    attestationHash: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
  },
  "cert-demo-002": {
    id: "cert-demo-002",
    ownerAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    mintedAt: "2025-02-03T08:12:00Z",
    manifestHash: "0xd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
    contentHash: "0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6",
    attestationHash: "0xf6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
  },
  "cert-demo-003": {
    id: "cert-demo-003",
    ownerAddress: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
    mintedAt: "2025-06-21T14:45:00Z",
    manifestHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    contentHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
    attestationHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
  },
};

export async function fetchCertificate(id: string): Promise<CertificateResult> {
  // Replace with real contract call once Provenance Contract is deployed
  await new Promise((res) => setTimeout(res, 800));

  const cert = MOCK_CERTIFICATES[id];
  if (!cert) {
    return { error: "Certificate not found. The ID may be invalid or the certificate may not exist on-chain." };
  }
  return { data: cert };
}

export type CertificateSearchField = "id" | "contentHash";

export interface CertificateSearchResult {
  results: ProvenanceCertificate[];
  error?: string;
}

/**
 * Searches the certificate registry by certificate ID or content hash.
 * Matching is case-insensitive and allows partial matches so users can
 * paste a truncated hash and still find the certificate.
 */
export async function searchCertificates(
  query: string,
  field: CertificateSearchField = "id"
): Promise<CertificateSearchResult> {
  // Replace with real contract/indexer call once Provenance Contract is deployed
  await new Promise((res) => setTimeout(res, 600));

  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [] };
  }

  const needle = trimmed.toLowerCase();
  const all = Object.values(MOCK_CERTIFICATES);
  const results = all.filter((cert) => {
    const haystack = field === "contentHash" ? cert.contentHash : cert.id;
    return haystack.toLowerCase().includes(needle);
  });

  if (results.length === 0) {
    return {
      results: [],
      error: "No certificates found. Check the value and try again.",
    };
  }

  return { results };
}

export function getCertificateVerificationUrl(id: string): string {
  const base =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://stellarproof.app";
  return `${base}/certificate/${id}`;
}
