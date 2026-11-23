import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { WalletProvider } from "@/context/WalletContext";
import { walletService, FREIGHTER_INSTALL_URL } from "@/services/wallet";
import { useWallet } from "../useWallet";

jest.mock("@/services/wallet", () => ({
  FREIGHTER_INSTALL_URL: "https://www.freighter.app/",
  walletService: {
    isInstalled: jest.fn(),
    requestAccess: jest.fn(),
    getAddress: jest.fn(),
    getNetworkDetails: jest.fn(),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => <WalletProvider>{children}</WalletProvider>;

describe("useWallet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (walletService.isInstalled as jest.Mock).mockResolvedValue(true);
    (walletService.requestAccess as jest.Mock).mockResolvedValue({ address: "GTEST123" });
    (walletService.getAddress as jest.Mock).mockResolvedValue(null);
    (walletService.getNetworkDetails as jest.Mock).mockResolvedValue(null);
  });

  it("starts in checking state then becomes disconnected when Freighter is detected", async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.status).toBe("checking");
    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    expect(result.current.isInstalled).toBe(true);
  });

  it("reports not-installed when Freighter is missing", async () => {
    (walletService.isInstalled as jest.Mock).mockResolvedValue(false);
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("not-installed"));
    expect(result.current.installUrl).toBe(FREIGHTER_INSTALL_URL);
  });

  it("connects and disconnects", async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("connected");
    expect(result.current.publicKey).toBe("GTEST123");
    act(() => result.current.disconnect());
    expect(result.current.status).toBe("disconnected");
  });

  it("surfaces connection errors", async () => {
    (walletService.requestAccess as jest.Mock).mockResolvedValue({ error: "User declined" });
    const { result } = renderHook(() => useWallet(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("disconnected"));
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("disconnected");
    expect(result.current.connectError).toBe("User declined");
  });
});
