import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserProductsView from "@/components/dashboard/UserProductsView";
import { DigitalProduct } from "@/services/productMock";

const sampleProducts: DigitalProduct[] = [
  {
    id: "product-1",
    requestId: "REQ-0001",
    name: "Limited Edition Digital Artwork",
    description: "One-of-a-kind digital masterpiece",
    imageUrl: "https://example.com/art.png",
    creator: "CryptoArtist_42",
    status: "verified",
    createdAt: new Date().toISOString(),
    verificationHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    manifest: {
      title: "Art Manifest",
      creator: "CryptoArtist_42",
      timestamp: new Date().toISOString(),
      version: "1.0",
      contentType: "image/png",
    },
    attestation: {
      enclaveId: "aws-nitro-enclave-01",
      verifier: "AWS Nitro TEE Oracle",
      status: "success",
      quoteHash: "0xa1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4",
      timestamp: new Date().toISOString(),
      measurementHash: "0x9988776655443322110099887766554433221100",
    },
    certificate: {
      certificateId: "CERT-ST-0001",
      stellarTxHash: "4a82f10b78c93de1f89024bc1234567890abcdef1234567890abcdef12345678",
      network: "Stellar Testnet",
      issuedAt: new Date().toISOString(),
      certificateUrl: "/certificate?id=CERT-ST-0001",
    },
  },
];

describe("UserProductsView", () => {
  it("renders header and quick action button", () => {
    render(<UserProductsView products={sampleProducts} isLoading={false} />);

    expect(screen.getByText(/My Verified Products & Provenance/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Verify Authenticity action button/i })).toBeInTheDocument();
  });

  it("renders products table with mock data", () => {
    render(<UserProductsView products={sampleProducts} isLoading={false} />);

    expect(screen.getByText("Limited Edition Digital Artwork")).toBeInTheDocument();
    expect(screen.getByText("REQ-0001")).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
  });

  it("opens Manifest modal on button click", async () => {
    const user = userEvent.setup();
    render(<UserProductsView products={sampleProducts} isLoading={false} />);

    const manifestBtn = screen.getByRole("button", { name: /View Manifest for Limited Edition Digital Artwork/i });
    await user.click(manifestBtn);

    expect(screen.getByText(/Manifest Details — Limited Edition Digital Artwork/i)).toBeInTheDocument();
    expect(screen.getByText(/Art Manifest/i)).toBeInTheDocument();
  });

  it("opens TEE Proof modal on button click", async () => {
    const user = userEvent.setup();
    render(<UserProductsView products={sampleProducts} isLoading={false} />);

    const teeBtn = screen.getByRole("button", { name: /View TEE Attestation for Limited Edition Digital Artwork/i });
    await user.click(teeBtn);

    expect(screen.getByText(/TEE Attestation Report — Limited Edition Digital Artwork/i)).toBeInTheDocument();
    expect(screen.getByText(/aws-nitro-enclave-01/i)).toBeInTheDocument();
  });
});
