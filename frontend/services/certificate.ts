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

export function getCertificateVerificationUrl(id: string): string {
  const base =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://stellarproof.app";
  return `${base}/certificate/${id}`;
}
