export interface Web2VerificationRequest {
  id: string;
  productName: string;
  date: string;
  contentHash: string;
  manifestHash: string;
  status: "verified" | "pending" | "processing" | "failed";
}

export interface Web2Certificate {
  id: string;
  productName: string;
  issuedDate: string;
  certificateHash: string;
  attestationHash: string;
  status: "active" | "revoked";
}

export interface Web2Manifest {
  id: string;
  productName: string;
  createdDate: string;
  manifestHash: string;
  type: string;
}

export interface Web2Attestation {
  id: string;
  productName: string;
  attestedDate: string;
  attestationHash: string;
  oracle: string;
}

export const fetchWeb2DashboardData = async (): Promise<{
  requests: Web2VerificationRequest[];
  certificates: Web2Certificate[];
  manifests: Web2Manifest[];
  attestations: Web2Attestation[];
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        requests: [
          {
            id: "REQ-2024-001",
            productName: "Limited Edition Digital Artwork",
            date: "2024-06-15",
            contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
            manifestHash: "0x1234567890abcdef1234567890abcdef12345678",
            status: "verified",
          },
          {
            id: "REQ-2024-002",
            productName: "Exclusive Music Album",
            date: "2024-06-20",
            contentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
            manifestHash: "0xabc123def456abc123def456abc123def456ab",
            status: "processing",
          },
          {
            id: "REQ-2024-003",
            productName: "Premium E-Book Collection",
            date: "2024-06-25",
            contentHash: "0x9876543210fedcba9876543210fedcba98765432",
            manifestHash: "0xfedcba0987654321fedcba0987654321fedcba09",
            status: "pending",
          },
        ],
        certificates: [
          {
            id: "CERT-001",
            productName: "Limited Edition Digital Artwork",
            issuedDate: "2024-06-15",
            certificateHash: "0xcertabc123def456abc123def456abc123def45",
            attestationHash: "0xattest123abc456def123abc456def123abc456de",
            status: "active",
          },
          {
            id: "CERT-002",
            productName: "Vintage Digital Photography Bundle",
            issuedDate: "2024-05-20",
            certificateHash: "0xcertdef456abc123def456abc123def456abc12",
            attestationHash: "0xattest456def123abc456def123abc456def123ab",
            status: "active",
          },
        ],
        manifests: [
          {
            id: "MAN-001",
            productName: "Limited Edition Digital Artwork",
            createdDate: "2024-06-10",
            manifestHash: "0x1234567890abcdef1234567890abcdef12345678",
            type: "Digital Art",
          },
          {
            id: "MAN-002",
            productName: "Exclusive Music Album",
            createdDate: "2024-06-18",
            manifestHash: "0xabc123def456abc123def456abc123def456ab",
            type: "Audio",
          },
        ],
        attestations: [
          {
            id: "ATT-001",
            productName: "Limited Edition Digital Artwork",
            attestedDate: "2024-06-15",
            attestationHash: "0xattest123abc456def123abc456def123abc456de",
            oracle: "Stellar Oracle",
          },
          {
            id: "ATT-002",
            productName: "Vintage Digital Photography Bundle",
            attestedDate: "2024-05-20",
            attestationHash: "0xattest456def123abc456def123abc456def123ab",
            oracle: "Stellar Oracle",
          },
        ],
      });
    }, 800);
  });
};
