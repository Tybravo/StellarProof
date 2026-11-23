import { createWalletService } from "../wallet";

const isConnected = jest.fn();
jest.mock("@stellar/freighter-api", () => ({ isConnected: (...a: unknown[]) => isConnected(...a) }));

describe("walletService.isInstalled", () => {
  beforeEach(() => isConnected.mockReset());

  it("is true when Freighter reports it is connected", async () => {
    isConnected.mockResolvedValue({ isConnected: true });
    expect(await createWalletService().isInstalled()).toBe(true);
  });

  it("is false when isConnected() returns false (no extension)", async () => {
    isConnected.mockResolvedValue({ isConnected: false });
    expect(await createWalletService().isInstalled()).toBe(false);
  });

  it("is false when isConnected() throws or returns an error", async () => {
    isConnected.mockRejectedValue(new Error("boom"));
    expect(await createWalletService().isInstalled()).toBe(false);
    isConnected.mockResolvedValue({ isConnected: false, error: { message: "x" } });
    expect(await createWalletService().isInstalled()).toBe(false);
  });
});
