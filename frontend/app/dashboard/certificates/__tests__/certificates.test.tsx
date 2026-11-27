import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import CertificatesPage from "../page";
import { fetchMintedCertificates } from "@/services/attestationsClient";
import { useWallet } from "@/context/WalletContext";

jest.mock("@/context/WalletContext", () => ({ useWallet: jest.fn() }));
jest.mock("@/services/attestationsClient", () => ({ fetchMintedCertificates: jest.fn() }));

const mockFetch = fetchMintedCertificates as jest.Mock;
const mockWallet = useWallet as jest.Mock;

const OWNER = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

const record = (n: number) => ({
  id: `att-${n}`,
  ownerAddress: OWNER,
  status: "minted",
  attestedAt: "2026-08-01T08:12:00Z",
  contentHash: `0x${String(n).repeat(64)}`,
  manifestHash: `0x${String(n).repeat(64)}`,
  attestationHash: `0x${String(n + 1).repeat(64)}`,
  certificateId: `cert-${n}`,
  txHash: `0x${String(n).repeat(64)}`,
});

const connected = () =>
  mockWallet.mockReturnValue({
    publicKey: OWNER,
    isConnected: true,
    isConnecting: false,
    connect: jest.fn(),
  });

describe("CertificatesPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("prompts to connect a wallet and does not fetch", async () => {
    const connect = jest.fn();
    mockWallet.mockReturnValue({
      publicKey: null,
      isConnected: false,
      isConnecting: false,
      connect,
    });
    render(<CertificatesPage />);
    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    expect(connect).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows a loading skeleton, then renders each certificate as a link", async () => {
    connected();
    let resolve!: (v: unknown[]) => void;
    mockFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<CertificatesPage />);
    expect(screen.getAllByTestId("certificate-skeleton").length).toBeGreaterThan(0);

    resolve([record(1), record(2)]);
    const first = await screen.findByRole("link", { name: /cert-1/ });
    expect(first).toHaveAttribute("href", "/certificate/cert-1");
    expect(screen.getByRole("link", { name: /cert-2/ })).toHaveAttribute(
      "href",
      "/certificate/cert-2"
    );
    expect(screen.queryByTestId("certificate-skeleton")).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(OWNER, expect.any(AbortSignal));
  });

  it("shows an empty state when there are no certificates", async () => {
    connected();
    mockFetch.mockResolvedValue([]);
    render(<CertificatesPage />);
    expect(await screen.findByText(/have not minted any certificates/i)).toBeInTheDocument();
  });

  it("shows an error and recovers on retry", async () => {
    connected();
    mockFetch.mockRejectedValueOnce(new Error("Server unavailable"));
    mockFetch.mockResolvedValueOnce([record(3)]);
    render(<CertificatesPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /cert-3/ })).toBeInTheDocument()
    );
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
