"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";
import {
  getStakePosition,
  stake,
  unstake,
  type StakePosition,
} from "@/services/stakingService";

type Mode = "stake" | "unstake";

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`;
}

export default function OracleStakingPage() {
  const { publicKey, isConnected, connect } = useWallet();
  const { addToast } = useToast();

  const [position, setPosition] = useState<StakePosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("stake");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [refreshToken, setRefreshToken] = useState(0);

  const refreshPosition = useCallback(() => {
    setLoading(true);
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!publicKey) {
      return;
    }

    let cancelled = false;

    getStakePosition(publicKey)
      .then((nextPosition) => {
        if (!cancelled) setPosition(nextPosition);
      })
      .catch(() => {
        if (!cancelled) addToast("Failed to load your stake position.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [publicKey, addToast, refreshToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError("Enter a valid amount greater than zero.");
      return;
    }

    if (!isConnected || !publicKey) {
      await connect();
      return;
    }

    if (mode === "unstake" && position && parsed > position.stakedXlm) {
      setFormError("You cannot unstake more than your current collateral.");
      return;
    }

    setSubmitting(true);
    try {
      const action = mode === "stake" ? stake : unstake;
      await action(parsed, publicKey);
      addToast(
        `${mode === "stake" ? "Staked" : "Unstaked"} ${formatXlm(parsed)} successfully.`,
        "success"
      );
      setAmount("");
      refreshPosition();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed. Please try again.";
      setFormError(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isUndercollateralized = position
    ? position.stakedXlm < position.minRequiredXlm
    : false;
  const showLoadingSkeleton = loading && isConnected;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Oracle Staking
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Manage your XLM collateral and review staking rewards for your Oracle node.
          </p>
        </div>

        {!isConnected && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
            Connect your Freighter wallet to manage your collateral.
            <button
              type="button"
              onClick={() => connect()}
              className="ml-2 font-semibold underline hover:no-underline"
            >
              Connect wallet
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            Current Collateral
          </h2>

          {showLoadingSkeleton ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : position ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Staked</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatXlm(position.stakedXlm)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Minimum Required</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatXlm(position.minRequiredXlm)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-white/5 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Rewards</p>
                <p className="mt-1 text-lg font-semibold text-green-600 dark:text-green-400">
                  {formatXlm(position.pendingRewardsXlm)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connect a wallet to view your stake position.
            </p>
          )}

          {isUndercollateralized && (
            <p role="alert" className="mt-4 text-xs text-red-600 dark:text-red-400">
              Your collateral is below the required minimum. Add stake to remain an active node.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("stake")}
              aria-pressed={mode === "stake"}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === "stake"
                  ? "bg-primary text-white"
                  : "border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300"
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" aria-hidden />
              Stake
            </button>
            <button
              type="button"
              onClick={() => setMode("unstake")}
              aria-pressed={mode === "unstake"}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                mode === "unstake"
                  ? "bg-primary text-white"
                  : "border border-gray-300 dark:border-white/10 text-gray-600 dark:text-gray-300"
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" aria-hidden />
              Unstake
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="stake-amount" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Amount (XLM)
              </label>
              <input
                id="stake-amount"
                type="number"
                min="0"
                step="0.0000001"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>

            {formError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isConnected ? (mode === "stake" ? "Stake XLM" : "Unstake XLM") : "Connect wallet"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
