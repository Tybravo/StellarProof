"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { castVote, type CastVoteResult, type VoteChoice } from "@/services/governanceService";

export interface UseSignVoteTxResult {
  /** Signs and submits an XLM-weighted vote for the given proposal. */
  signVote: (proposalId: string, choice: VoteChoice) => Promise<CastVoteResult | null>;
  /** True while the Freighter signing + submission flow is in flight. */
  isSigning: boolean;
  /** Error message from the most recent attempt, if any. */
  error: string | null;
  /** Result of the most recent successful vote submission. */
  result: CastVoteResult | null;
  /** Clears any error/result state. */
  reset: () => void;
}

/**
 * Hooks the governance voting UI up to the Freighter wallet so a connected
 * node operator can sign and submit the on-chain Soroban voting transaction.
 */
export function useSignVoteTx(): UseSignVoteTxResult {
  const { publicKey, isConnected, connect } = useWallet();
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CastVoteResult | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const signVote = useCallback(
    async (proposalId: string, choice: VoteChoice) => {
      setError(null);
      setResult(null);
      setIsSigning(true);

      try {
        if (!isConnected || !publicKey) {
          await connect();
        }

        if (!publicKey) {
          throw new Error("Connect your Freighter wallet before voting.");
        }

        const voteResult = await castVote(proposalId, choice, publicKey);
        setResult(voteResult);
        return voteResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to sign and submit your vote.";
        setError(message);
        return null;
      } finally {
        setIsSigning(false);
      }
    },
    [connect, isConnected, publicKey]
  );

  return { signVote, isSigning, error, result, reset };
}
