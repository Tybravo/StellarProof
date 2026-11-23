import { render, screen } from "@testing-library/react";
import { WalletProvider } from "@/context/WalletContext";
import { walletService } from "@/services/wallet";
import { ConnectWalletButton } from "../ConnectWalletButton";

jest.mock("@/services/wallet", () => ({
  FREIGHTER_INSTALL_URL: "https://www.freighter.app/",
  walletService: {
    isInstalled: jest.fn(),
    requestAccess: jest.fn(),
    getAddress: jest.fn(),
    getNetworkDetails: jest.fn(),
  },
}));

describe("ConnectWalletButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (walletService.getAddress as jest.Mock).mockResolvedValue(null);
    (walletService.getNetworkDetails as jest.Mock).mockResolvedValue(null);
  });

  it("shows a download prompt when the extension is not detected", async () => {
    (walletService.isInstalled as jest.Mock).mockResolvedValue(false);
    render(<WalletProvider><ConnectWalletButton /></WalletProvider>);
    const link = await screen.findByRole("link", { name: /install freighter/i });
    expect(link).toHaveAttribute("href", "https://www.freighter.app/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
  });

  it("shows a connect button when Freighter is installed", async () => {
    (walletService.isInstalled as jest.Mock).mockResolvedValue(true);
    render(<WalletProvider><ConnectWalletButton /></WalletProvider>);
    expect(await screen.findByRole("button", { name: /connect wallet/i })).toBeEnabled();
    expect(screen.queryByRole("link", { name: /install freighter/i })).not.toBeInTheDocument();
  });
});
