import { renderHook, waitFor, act } from "@testing-library/react";
import { useSignVoteTx } from "../useSignVoteTx";
import { castVote } from "@/services/governanceService";
import { useWallet } from "@/context/WalletContext";

jest.mock("@/services/governanceService", () => ({
  castVote: jest.fn(),
}));

jest.mock("@/context/WalletContext", () => ({
  useWallet: jest.fn(),
}));

const mockedCastVote = castVote as jest.Mock;
const mockedUseWallet = useWallet as jest.Mock;

describe("useSignVoteTx", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs and submits a vote when a wallet is already connected", async () => {
    mockedUseWallet.mockReturnValue({
      publicKey: "GTEST123",
      isConnected: true,
      connect: jest.fn(),
    });
    mockedCastVote.mockResolvedValue({
      txHash: "abc123",
      proposalId: "GOV-001",
      choice: "for",
    });

    const { result } = renderHook(() => useSignVoteTx());

    let voteResult;
    await act(async () => {
      voteResult = await result.current.signVote("GOV-001", "for");
    });

    expect(mockedCastVote).toHaveBeenCalledWith("GOV-001", "for", "GTEST123");
    expect(voteResult).toEqual({ txHash: "abc123", proposalId: "GOV-001", choice: "for" });
    expect(result.current.result).toEqual({ txHash: "abc123", proposalId: "GOV-001", choice: "for" });
    expect(result.current.error).toBeNull();
    expect(result.current.isSigning).toBe(false);
  });

  it("attempts to connect the wallet first when not connected", async () => {
    const connect = jest.fn().mockResolvedValue(undefined);
    mockedUseWallet.mockReturnValue({
      publicKey: null,
      isConnected: false,
      connect,
    });

    const { result } = renderHook(() => useSignVoteTx());

    await act(async () => {
      await result.current.signVote("GOV-001", "for");
    });

    expect(connect).toHaveBeenCalledTimes(1);
    expect(mockedCastVote).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Connect your Freighter wallet before voting.");
  });

  it("surfaces an error message when signing fails", async () => {
    mockedUseWallet.mockReturnValue({
      publicKey: "GTEST123",
      isConnected: true,
      connect: jest.fn(),
    });
    mockedCastVote.mockRejectedValue(new Error("You declined the signing request."));

    const { result } = renderHook(() => useSignVoteTx());

    await act(async () => {
      const voteResult = await result.current.signVote("GOV-001", "against");
      expect(voteResult).toBeNull();
    });

    await waitFor(() => {
      expect(result.current.error).toBe("You declined the signing request.");
    });
    expect(result.current.result).toBeNull();
  });

  it("reset clears error and result state", async () => {
    mockedUseWallet.mockReturnValue({
      publicKey: "GTEST123",
      isConnected: true,
      connect: jest.fn(),
    });
    mockedCastVote.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useSignVoteTx());

    await act(async () => {
      await result.current.signVote("GOV-001", "for");
    });
    expect(result.current.error).toBe("boom");

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result).toBeNull();
  });
});
