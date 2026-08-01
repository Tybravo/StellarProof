export type KmsEncryptionStatus = "encrypted" | "pending" | "unencrypted";
export type AssetVerificationStatus = "verified" | "pending" | "revoked";

export interface DigitalAsset {
  id: string;
  name: string;
  type: string;
  owner: string;
  contentHash: string;
  kmsEncryptionStatus: KmsEncryptionStatus;
  kmsKeyId: string;
  verifiedAt: string | null;
  createdAt: string;
  status: AssetVerificationStatus;
  sizeBytes: number;
}

export const MOCK_ASSETS: DigitalAsset[] = [
  {
    id: "asset-1",
    name: "Limited Edition Digital Artwork",
    type: "Image",
    owner: "CryptoArtist_42",
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    kmsEncryptionStatus: "encrypted",
    kmsKeyId: "kms-key-7f3a9c2e",
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    status: "verified",
    sizeBytes: 2_457_600,
  },
  {
    id: "asset-2",
    name: "Exclusive Music Album",
    type: "Audio",
    owner: "BeatMakerPro",
    contentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    kmsEncryptionStatus: "encrypted",
    kmsKeyId: "kms-key-4b8d1f5a",
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    status: "verified",
    sizeBytes: 52_428_800,
  },
  {
    id: "asset-3",
    name: "Premium E-Book Collection",
    type: "Document",
    owner: "BookWormPublish",
    contentHash: "0x1234567890abcdef1234567890abcdef12345678",
    kmsEncryptionStatus: "pending",
    kmsKeyId: "kms-key-2c6e0a7d",
    verifiedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    status: "pending",
    sizeBytes: 819_200,
  },
  {
    id: "asset-4",
    name: "Vintage Digital Photography Bundle",
    type: "Image",
    owner: "VintageLens",
    contentHash: "0xabc123def456abc123def456abc123def456ab",
    kmsEncryptionStatus: "encrypted",
    kmsKeyId: "kms-key-9a1b4c8f",
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 58).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    status: "verified",
    sizeBytes: 8_388_608,
  },
  {
    id: "asset-5",
    name: "3D Printable Model Pack",
    type: "3D Model",
    owner: "MakerStudio",
    contentHash: "0x9876543210fedcba9876543210fedcba98765432",
    kmsEncryptionStatus: "unencrypted",
    kmsKeyId: "-",
    verifiedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "revoked",
    sizeBytes: 5_242_880,
  },
  {
    id: "asset-6",
    name: "Software License Premium",
    type: "License",
    owner: "TechSoft Inc.",
    contentHash: "0xfedcba0987654321fedcba0987654321fedcba09",
    kmsEncryptionStatus: "encrypted",
    kmsKeyId: "kms-key-6c9a3b1d",
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 44).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    status: "verified",
    sizeBytes: 4_096,
  },
];

/**
 * Fetches the digital assets belonging to a wallet. Replace with a real
 * indexer/contract call once asset provenance data is served from-chain.
 */
export async function fetchAssets(
  __publicKey?: string
): Promise<DigitalAsset[]> {
  void __publicKey;
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_ASSETS;
}
