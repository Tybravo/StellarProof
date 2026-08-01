export interface MockManifest {
  manifestId: string;
  title: string;
  schemaVersion: string;
  creatorEmail: string;
  createdAt: string;
  contentHash: string;
  attributes: Record<string, string>;
}

export interface MockAttestation {
  attestationId: string;
  manifestId: string;
  oracleId: string;
  status: "verified" | "pending" | "failed";
  timestamp: string;
  signature: string;
  verificationMethod: string;
}

export interface MockCertificate {
  certificateId: string;
  productId: string;
  issuer: string;
  recipientEmail: string;
  issuedAt: string;
  manifestHash: string;
  attestationHash: string;
  certificateUrl: string;
  status: "active" | "revoked";
}

export interface MockVerificationRequest {
  requestId: string;
  productId: string;
  productName: string;
  requestDate: string;
  contentHash: string;
  status: "verified" | "pending" | "processing" | "failed";
  manifest: MockManifest;
  attestation: MockAttestation;
  certificate?: MockCertificate;
}

export interface Web2UserProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  creator: string;
  status: "verified" | "pending" | "revoked";
  createdAt: string;
  contentHash: string;
  manifest: MockManifest;
  attestation: MockAttestation;
  certificate?: MockCertificate;
}

const MOCK_MANIFESTS: MockManifest[] = [
  {
    manifestId: "mnf-101",
    title: "Genesis NFT Collection Manifest",
    schemaVersion: "v1.2.0",
    creatorEmail: "user@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    attributes: {
      edition: "1 of 10",
      fileFormat: "PNG/300DPI",
      license: "Commercial Digital License",
    },
  },
  {
    manifestId: "mnf-102",
    title: "Synthwave Audio Master Manifest",
    schemaVersion: "v1.2.0",
    creatorEmail: "user@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    contentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    attributes: {
      bitrate: "24-bit / 96kHz",
      duration: "03:45",
      rights: "Exclusive Streaming & Download",
    },
  },
  {
    manifestId: "mnf-103",
    title: "Decentralized Architecture E-Book",
    schemaVersion: "v1.1.0",
    creatorEmail: "user@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    contentHash: "0x1234567890abcdef1234567890abcdef12345678",
    attributes: {
      pages: "240",
      isbn: "978-3-16-148410-0",
      format: "PDF/EPUB",
    },
  },
  {
    manifestId: "mnf-104",
    title: "Industrial 3D Model Pack",
    schemaVersion: "v1.2.0",
    creatorEmail: "user@example.com",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    contentHash: "0x9876543210fedcba9876543210fedcba98765432",
    attributes: {
      polygons: "150,000",
      textures: "4K PBR",
      software: "Blender 4.1",
    },
  },
];

const MOCK_ATTESTATIONS: MockAttestation[] = [
  {
    attestationId: "att-201",
    manifestId: "mnf-101",
    oracleId: "StellarProof-TEE-Oracle-01",
    status: "verified",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 29).toISOString(),
    signature: "0x789a...b123",
    verificationMethod: "Intel SGX Enclave Hash Verification",
  },
  {
    attestationId: "att-202",
    manifestId: "mnf-102",
    oracleId: "StellarProof-TEE-Oracle-02",
    status: "verified",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    signature: "0x456c...d890",
    verificationMethod: "Zero-Knowledge Proof Attestation",
  },
  {
    attestationId: "att-203",
    manifestId: "mnf-103",
    oracleId: "StellarProof-TEE-Oracle-01",
    status: "pending",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    signature: "0x0000...0000",
    verificationMethod: "Automated Hash Matching",
  },
  {
    attestationId: "att-204",
    manifestId: "mnf-104",
    oracleId: "StellarProof-TEE-Oracle-03",
    status: "verified",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    signature: "0xef12...3456",
    verificationMethod: "Multi-Sig Validator Consensus",
  },
];

const MOCK_CERTIFICATES: MockCertificate[] = [
  {
    certificateId: "cert-301",
    productId: "product-1",
    issuer: "StellarProof Authority",
    recipientEmail: "user@example.com",
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    manifestHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    attestationHash: "0x789ab123789ab123789ab123789ab123789ab123",
    certificateUrl: "/certificate/cert-301",
    status: "active",
  },
  {
    certificateId: "cert-302",
    productId: "product-2",
    issuer: "StellarProof Authority",
    recipientEmail: "user@example.com",
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
    manifestHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    attestationHash: "0x456cd890456cd890456cd890456cd890456cd890",
    certificateUrl: "/certificate/cert-302",
    status: "active",
  },
  {
    certificateId: "cert-304",
    productId: "product-4",
    issuer: "StellarProof Authority",
    recipientEmail: "user@example.com",
    issuedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    manifestHash: "0x9876543210fedcba9876543210fedcba98765432",
    attestationHash: "0xef123456ef123456ef123456ef123456ef123456",
    certificateUrl: "/certificate/cert-304",
    status: "active",
  },
];

const MOCK_PRODUCTS: Web2UserProduct[] = [
  {
    id: "product-1",
    name: "Limited Edition Digital Artwork",
    category: "Digital Art",
    description: "One-of-a-kind digital masterpiece, provably authenticated on Stellar network.",
    imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop",
    creator: "CryptoArtist_42",
    status: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    manifest: MOCK_MANIFESTS[0],
    attestation: MOCK_ATTESTATIONS[0],
    certificate: MOCK_CERTIFICATES[0],
  },
  {
    id: "product-2",
    name: "Exclusive Synthwave Music Album",
    category: "Audio / Music",
    description: "Limited release synthwave album with digital provenance tracked on-chain.",
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
    creator: "BeatMakerPro",
    status: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    contentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    manifest: MOCK_MANIFESTS[1],
    attestation: MOCK_ATTESTATIONS[1],
    certificate: MOCK_CERTIFICATES[1],
  },
  {
    id: "product-3",
    name: "Decentralized Systems E-Book",
    category: "Publication",
    description: "Complete guide to distributed consensus and cryptographic verification.",
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
    creator: "BookWormPublish",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    contentHash: "0x1234567890abcdef1234567890abcdef12345678",
    manifest: MOCK_MANIFESTS[2],
    attestation: MOCK_ATTESTATIONS[2],
  },
  {
    id: "product-4",
    name: "Industrial 3D Model Pack",
    category: "3D Models",
    description: "High-resolution PBR textured 3D models with verified cryptographic manifest.",
    imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
    creator: "MakerStudio",
    status: "verified",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    contentHash: "0x9876543210fedcba9876543210fedcba98765432",
    manifest: MOCK_MANIFESTS[3],
    attestation: MOCK_ATTESTATIONS[3],
    certificate: MOCK_CERTIFICATES[2],
  },
];

const MOCK_VERIFICATION_REQUESTS: MockVerificationRequest[] = [
  {
    requestId: "req-501",
    productId: "product-1",
    productName: "Limited Edition Digital Artwork",
    requestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    status: "verified",
    manifest: MOCK_MANIFESTS[0],
    attestation: MOCK_ATTESTATIONS[0],
    certificate: MOCK_CERTIFICATES[0],
  },
  {
    requestId: "req-502",
    productId: "product-2",
    productName: "Exclusive Synthwave Music Album",
    requestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    contentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    status: "verified",
    manifest: MOCK_MANIFESTS[1],
    attestation: MOCK_ATTESTATIONS[1],
    certificate: MOCK_CERTIFICATES[1],
  },
  {
    requestId: "req-503",
    productId: "product-3",
    productName: "Decentralized Systems E-Book",
    requestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    contentHash: "0x1234567890abcdef1234567890abcdef12345678",
    status: "pending",
    manifest: MOCK_MANIFESTS[2],
    attestation: MOCK_ATTESTATIONS[2],
  },
  {
    requestId: "req-504",
    productId: "product-4",
    productName: "Industrial 3D Model Pack",
    requestDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    contentHash: "0x9876543210fedcba9876543210fedcba98765432",
    status: "verified",
    manifest: MOCK_MANIFESTS[3],
    attestation: MOCK_ATTESTATIONS[3],
    certificate: MOCK_CERTIFICATES[2],
  },
];

export const web2DashboardService = {
  async getWeb2UserProducts(__userEmail?: string): Promise<Web2UserProduct[]> {
    void __userEmail;
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_PRODUCTS]), 300);
    });
  },

  async getWeb2VerificationRequests(__userEmail?: string): Promise<MockVerificationRequest[]> {
    void __userEmail;
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_VERIFICATION_REQUESTS]), 300);
    });
  },

  async getWeb2Manifests(__userEmail?: string): Promise<MockManifest[]> {
    void __userEmail;
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_MANIFESTS]), 300);
    });
  },

  async getWeb2Attestations(__userEmail?: string): Promise<MockAttestation[]> {
    void __userEmail;
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_ATTESTATIONS]), 300);
    });
  },

  async getWeb2Certificates(__userEmail?: string): Promise<MockCertificate[]> {
    void __userEmail;
    return new Promise((resolve) => {
      setTimeout(() => resolve([...MOCK_CERTIFICATES]), 300);
    });
  },
};
