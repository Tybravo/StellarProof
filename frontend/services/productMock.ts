export interface DigitalProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  creator: string;
  status: "verified" | "pending" | "revoked";
  createdAt: string;
  verificationHash: string;
}

export const fetchDigitalProducts = async (): Promise<DigitalProduct[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "product-1",
          name: "Limited Edition Digital Artwork",
          description: "One-of-a-kind digital masterpiece, provably authenticated on the Stellar blockchain.",
          imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop",
          creator: "CryptoArtist_42",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          verificationHash: "0xabcdef1234567890abcdef1234567890abcdef12",
        },
        {
          id: "product-2",
          name: "Exclusive Music Album",
          description: "Limited release album with full ownership verified on-chain.",
          imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
          creator: "BeatMakerPro",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
          verificationHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
        },
        {
          id: "product-3",
          name: "Premium E-Book Collection",
          description: "Complete digital library with provenance tracked via StellarProof.",
          imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop",
          creator: "BookWormPublish",
          status: "pending",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
          verificationHash: "0x1234567890abcdef1234567890abcdef12345678",
        },
        {
          id: "product-4",
          name: "Vintage Digital Photography Bundle",
          description: "Collection of 100+ high-resolution vintage photos, authenticated.",
          imageUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop",
          creator: "VintageLens",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
          verificationHash: "0xabc123def456abc123def456abc123def456ab",
        },
        {
          id: "product-5",
          name: "3D Printable Model Pack",
          description: "STL files for 3D printing with authenticity verified on blockchain.",
          imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop",
          creator: "MakerStudio",
          status: "pending",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
          verificationHash: "0x9876543210fedcba9876543210fedcba98765432",
        },
        {
          id: "product-6",
          name: "Software License Premium",
          description: "Perpetual software license with ownership tracked via Stellar.",
          imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop",
          creator: "TechSoft Inc.",
          status: "verified",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          verificationHash: "0xfedcba0987654321fedcba0987654321fedcba09",
        },
      ]);
    }, 500);
  });
};
