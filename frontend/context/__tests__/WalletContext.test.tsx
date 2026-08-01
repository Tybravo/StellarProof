import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletProvider, useWallet } from "../WalletContext";
import { walletService } from "@/services/wallet";

jest.mock("@/services/wallet", () => ({
  walletService: {
    isInstalled: jest.fn(),
    requestAccess: jest.fn(),
    getAddress: jest.fn(),
    getNetworkDetails: jest.fn(),
  },
}));

function WalletHarness() {
  const { connect, isConnected } = useWallet();

  return (
    <div>
      <button onClick={() => connect()}>Connect wallet</button>
      <span>{isConnected ? "connected" : "disconnected"}</span>
    </div>
  );
}

describe("WalletContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (walletService.isInstalled as jest.Mock).mockResolvedValue(true);
    (walletService.requestAccess as jest.Mock).mockResolvedValue({ address: "GTEST123" });
    (walletService.getAddress as jest.Mock).mockResolvedValue(null);
    (walletService.getNetworkDetails as jest.Mock).mockResolvedValue({
      network: "testnet",
      networkPassphrase: "Test SDF Network ; September 2015",
    });
  });

  it("uses the Freighter requestAccess flow when connecting", async () => {
    render(
      <WalletProvider>
        <WalletHarness />
      </WalletProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    await waitFor(() => {
      expect(screen.getByText("connected")).toBeInTheDocument();
    });

    expect(walletService.requestAccess).toHaveBeenCalledTimes(1);
    expect(walletService.getAddress).not.toHaveBeenCalled();
  });
});
