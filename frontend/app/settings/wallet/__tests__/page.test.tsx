import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WalletSettingsPage from "../page";
import { AuthApiError } from "@/services/auth";

const mockLinkWallet = jest.fn();
const mockConnect = jest.fn();
const mockAddToast = jest.fn();
let authUser: { email: string; stellarPublicKey?: string } = { email: "ada@example.com" };
let wallet = {
  publicKey: null as string | null,
  isConnected: false,
  isConnecting: false,
  isFreighterInstalled: true as boolean | null,
  connectError: null as string | null,
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock("@/app/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isInitialized: true,
    user: authUser,
    linkWallet: mockLinkWallet,
  }),
}));
jest.mock("@/context/WalletContext", () => ({
  useWallet: () => ({ ...wallet, connect: mockConnect }),
}));
jest.mock("@/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW";

beforeEach(() => {
  jest.clearAllMocks();
  authUser = { email: "ada@example.com" };
  wallet = {
    publicKey: null,
    isConnected: false,
    isConnecting: false,
    isFreighterInstalled: true,
    connectError: null,
  };
});

describe("WalletSettingsPage", () => {
  it("triggers Freighter from the connect button", async () => {
    const user = userEvent.setup();
    render(<WalletSettingsPage />);

    expect(screen.getByText(/no wallet is linked/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /connect freighter/i }));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("links the connected wallet to the account", async () => {
    wallet = { ...wallet, isConnected: true, publicKey: KEY };
    mockLinkWallet.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<WalletSettingsPage />);

    await user.click(screen.getByRole("button", { name: /link wallet to account/i }));

    expect(mockLinkWallet).toHaveBeenCalledWith(KEY);
    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith({
        type: "success",
        message: "Wallet linked to your account",
      }),
    );
  });

  it("shows the API error when linking fails", async () => {
    wallet = { ...wallet, isConnected: true, publicKey: KEY };
    mockLinkWallet.mockRejectedValue(new AuthApiError("Wallet already linked elsewhere", 409));
    const user = userEvent.setup();
    render(<WalletSettingsPage />);

    await user.click(screen.getByRole("button", { name: /link wallet to account/i }));

    expect(await screen.findByText("Wallet already linked elsewhere")).toBeInTheDocument();
  });

  it("disables linking when the connected wallet is already linked", () => {
    authUser = { email: "ada@example.com", stellarPublicKey: KEY };
    wallet = { ...wallet, isConnected: true, publicKey: KEY };
    render(<WalletSettingsPage />);

    expect(screen.getByRole("button", { name: /wallet linked/i })).toBeDisabled();
    expect(screen.getByTestId("linked-key")).toHaveTextContent(KEY);
  });

  it("warns when Freighter is not installed", () => {
    wallet = { ...wallet, isFreighterInstalled: false };
    render(<WalletSettingsPage />);
    expect(screen.getByText(/freighter was not detected/i)).toBeInTheDocument();
  });
});
