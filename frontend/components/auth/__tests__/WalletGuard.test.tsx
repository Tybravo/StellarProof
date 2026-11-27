import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletProvider } from "@/context/WalletContext";
import { walletService } from "@/services/wallet";
import { WalletGuard } from "../WalletGuard";

jest.mock("@/services/wallet", () => ({
  FREIGHTER_INSTALL_URL: "https://www.freighter.app/",
  walletService: {
    isInstalled: jest.fn(),
    requestAccess: jest.fn(),
    getAddress: jest.fn(),
    getNetworkDetails: jest.fn(),
  },
}));

function renderGuard() {
  return render(
    <WalletProvider>
      <WalletGuard>
        <div>secret workflow</div>
      </WalletGuard>
    </WalletProvider>
  );
}

describe("WalletGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (walletService.isInstalled as jest.Mock).mockResolvedValue(true);
    (walletService.requestAccess as jest.Mock).mockResolvedValue({ address: "GTEST123" });
    (walletService.getAddress as jest.Mock).mockResolvedValue(null);
    (walletService.getNetworkDetails as jest.Mock).mockResolvedValue(null);
  });

  it("hides children and prompts to connect when no wallet is connected", async () => {
    renderGuard();
    expect(await screen.findByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.queryByText("secret workflow")).not.toBeInTheDocument();
  });

  it("reveals children after connecting", async () => {
    renderGuard();
    await userEvent.click(await screen.findByRole("button", { name: /connect wallet/i }));
    await waitFor(() => expect(screen.getByText("secret workflow")).toBeInTheDocument());
  });

  it("shows an install CTA when Freighter is not installed", async () => {
    (walletService.isInstalled as jest.Mock).mockResolvedValue(false);
    renderGuard();
    const link = await screen.findByRole("link", { name: /install freighter/i });
    expect(link).toHaveAttribute("href", "https://www.freighter.app/");
    expect(screen.queryByText("secret workflow")).not.toBeInTheDocument();
  });
});
