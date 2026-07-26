export interface ManifestData {
  title: string;
  creator: string;
  timestamp: string;
  version: string;
  contentType: string;
  device?: string;
  location?: string;
  rights?: string;
}

export interface AttestationData {
  enclaveId: string;
  verifier: string;
  status: "success" | "pending" | "failed";
  quoteHash: string;
  timestamp: string;
  measurementHash: string;
}

export interface CertificateData {
  certificateId: string;
  stellarTxHash: string;
  network: string;
  issuedAt: string;
  certificateUrl: string;
}

export interface DigitalProduct {
  id: string;
  requestId: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
  status: "verified" | "pending" | "revoked" | "failed";
  createdAt: string;
  verificationHash: string;
  manifest: ManifestData;
  attestation: AttestationData;
  certificate?: CertificateData;
}

export const fetchDigitalProducts = async (
  __publicKey?: string
): Promise<DigitalProduct[]> => {
  void __publicKey
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "product-1",
          requestId: "REQ-0001",
          name: "Limited Edition Digital Artwork",
          description: "One-of-a-kind digital masterpiece, provably authenticated on the Stellar blockchain.",
          imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop",
          creator: "CryptoArtist_42",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          verificationHash: "0xabcdef1234567890abcdef1234567890abcdef12",
          manifest: {
            title: "Limited Edition Digital Artwork Manifest",
            creator: "CryptoArtist_42",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
            version: "1.0",
            contentType: "image/png",
            device: "Wacom Cintiq Pro 24",
            rights: "All Rights Reserved",
          },
          attestation: {
            enclaveId: "aws-nitro-enclave-01",
            verifier: "AWS Nitro TEE Oracle",
            status: "success",
            quoteHash: "0xa1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 + 3600000).toISOString(),
            measurementHash: "0x9988776655443322110099887766554433221100",
          },
          certificate: {
            certificateId: "CERT-ST-0001",
            stellarTxHash: "4a82f10b78c93de1f89024bc1234567890abcdef1234567890abcdef12345678",
            network: "Stellar Testnet",
            issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 + 7200000).toISOString(),
            certificateUrl: "/certificate?id=CERT-ST-0001",
          },
        },
        {
          id: "product-2",
          requestId: "REQ-0002",
          name: "Exclusive Music Album",
          description: "Limited release album with full ownership verified on-chain.",
          imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
          creator: "BeatMakerPro",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
          verificationHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
          manifest: {
            title: "Exclusive Music Album Audio Manifest",
            creator: "BeatMakerPro",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
            version: "2.1",
            contentType: "audio/flac",
            device: "Studio Master DAW",
            rights: "Commercial Creative Commons",
          },
          attestation: {
            enclaveId: "aws-nitro-enclave-02",
            verifier: "AWS Nitro TEE Oracle",
            status: "success",
            quoteHash: "0xb2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15 + 1800000).toISOString(),
            measurementHash: "0x1122334455667788990011223344556677889900",
          },
          certificate: {
            certificateId: "CERT-ST-0002",
            stellarTxHash: "8b93f21c89d04ef2a90135cd234567890abcdef1234567890abcdef12345679",
            network: "Stellar Mainnet",
            issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15 + 3600000).toISOString(),
            certificateUrl: "/certificate?id=CERT-ST-0002",
          },
        },
        {
          id: "product-3",
          requestId: "REQ-0003",
          name: "Premium E-Book Collection",
          description: "Complete digital library with provenance tracked via StellarProof.",
          imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
          creator: "BookWormPublish",
          status: "pending",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          verificationHash: "0x1234567890abcdef1234567890abcdef12345678",
          manifest: {
            title: "Premium E-Book PDF Provenance",
            creator: "BookWormPublish",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            version: "1.0",
            contentType: "application/pdf",
          },
          attestation: {
            enclaveId: "aws-nitro-enclave-03",
            verifier: "AWS Nitro TEE Oracle",
            status: "pending",
            quoteHash: "0xc3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f6",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
            measurementHash: "0x3344556677889900112233445566778899001122",
          },
        },
        {
          id: "product-4",
          requestId: "REQ-0004",
          name: "Vintage Digital Photography Bundle",
          description: "Collection of 100+ high-resolution vintage photos, authenticated.",
          imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop",
          creator: "VintageLens",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
          verificationHash: "0xabc123def456abc123def456abc123def456ab",
          manifest: {
            title: "Vintage Photography RAW Archive Manifest",
            creator: "VintageLens",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
            version: "1.0",
            contentType: "application/zip",
            device: "Leica M10-R",
            location: "Berlin, Germany",
          },
          attestation: {
            enclaveId: "aws-nitro-enclave-01",
            verifier: "AWS Nitro TEE Oracle",
            status: "success",
            quoteHash: "0xd4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f678",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60 + 1200000).toISOString(),
            measurementHash: "0x4455667788990011223344556677889900112233",
          },
          certificate: {
            certificateId: "CERT-ST-0004",
            stellarTxHash: "7c82e10a67b82cd0e78913ab01234567890abcdef1234567890abcdef12345677",
            network: "Stellar Testnet",
            issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60 + 2400000).toISOString(),
            certificateUrl: "/certificate?id=CERT-ST-0004",
          },
        },
        {
          id: "product-5",
          requestId: "REQ-0005",
          name: "3D Printable Model Pack",
          description: "STL files for 3D printing with authenticity verified on blockchain.",
          imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
          creator: "MakerStudio",
          status: "pending",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          verificationHash: "0x9876543210fedcba9876543210fedcba98765432",
          manifest: {
            title: "3D Print STL Package Metadata",
            creator: "MakerStudio",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
            version: "1.0",
            contentType: "model/stl",
          },
          attestation: {
            enclaveId: "aws-nitro-enclave-02",
            verifier: "AWS Nitro TEE Oracle",
            status: "pending",
            quoteHash: "0xe5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
            measurementHash: "0x5566778899001122334455667788990011223344",
          },
        },
        {
          id: "product-6",
          requestId: "REQ-0006",
          name: "Software License Premium",
          description: "Perpetual software license with ownership tracked via Stellar.",
          imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop",
          creator: "TechSoft Inc.",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          verificationHash: "0xfedcba0987654321fedcba0987654321fedcba09",
          manifest: {
            title: "Enterprise Software License Manifest",
            creator: "TechSoft Inc.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
            version: "3.4",
            contentType: "application/json",
          },
          attestation: {
            enclaveId: "aws-nitro-enclave-01",
            verifier: "AWS Nitro TEE Oracle",
            status: "success",
            quoteHash: "0xf67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45 + 1500000).toISOString(),
            measurementHash: "0x6677889900112233445566778899001122334455",
          },
          certificate: {
            certificateId: "CERT-ST-0006",
            stellarTxHash: "6b71d00956a71bc0d67802ba901234567890abcdef1234567890abcdef12345666",
            network: "Stellar Mainnet",
            issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45 + 3000000).toISOString(),
            certificateUrl: "/certificate?id=CERT-ST-0006",
          },
        },
      ]);
    }, 400);
  });
};
