"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import Header from "@/components/Header";
import {
  fetchXlmBalance,
  fetchRecentTransactions,
  fundTestnetAccount,
  type HorizonTransaction,
} from "@/services/horizonService";
import {
  Copy,
  Check,
  RefreshCw,
  Coins,
  Activity,

  FileCheck,
  FolderKanban,
  Sparkles,
  Cpu,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import NetworkBadge from "@/components/wallet/NetworkBadge";

export default function WalletDashboardPage() {
  const router = useRouter();
  const { isConnected, publicKey, networkDetails } = useWallet();
  const { addToast } = useToast();

  const [balance, setBalance] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<HorizonTransaction[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isFunding, setIsFunding] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeNetwork = networkDetails?.network ?? "testnet";

  // Redirect disconnected users to /connect
  useEffect(() => {
    if (!isConnected) {
      router.push("/connect");
    }
  }, [isConnected, router]);

  // Fetch balance and transactions from Horizon
  const loadWalletDetails = useCallback(
    async (silent = false) => {
      if (!publicKey) return;

      if (!silent) {
        setIsLoadingDetails(true);
      }

      try {
        const [fetchedBalance, fetchedTxs] = await Promise.all([
          fetchXlmBalance(publicKey, activeNetwork),
          fetchRecentTransactions(publicKey, activeNetwork),
        ]);

        setBalance(fetchedBalance);
        setBalance(fetchedBalance);
        setTransactions(fetchedTxs);
      } catch (err: unknown) {
        console.error("Error loading wallet details:", err);
        addToast({
          type: "error",
          message: "Failed to fetch wallet information from Stellar network.",
        });
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [publicKey, activeNetwork, addToast]
  );

  // Load initially when public key is available
  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    Promise.all([
      fetchXlmBalance(publicKey, activeNetwork),
      fetchRecentTransactions(publicKey, activeNetwork),
    ])
      .then(([fetchedBalance, fetchedTxs]) => {
        if (!cancelled) {
          setBalance(fetchedBalance);
          setTransactions(fetchedTxs);
        }
      })
      .catch((err: unknown) => {
        console.error("Error loading wallet details:", err);
        if (!cancelled) {
          addToast({
            type: "error",
            message: "Failed to fetch wallet information from Stellar network.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetails(false);
      });
    return () => { cancelled = true; };
  }, [publicKey, activeNetwork, addToast]);

  // Truncate address for display
  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Copy full address to clipboard
  const handleCopyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      addToast({
        type: "success",
        message: "Wallet address copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  // Friendbot Faucet funding (testnet only)
  const handleFundTestnet = async () => {
    if (!publicKey || activeNetwork !== "testnet") return;

    setIsFunding(true);
    addToast({
      type: "info",
      message: "Requesting testnet XLM from Stellar Friendbot...",
    });

    try {
      const success = await fundTestnetAccount(publicKey);
      if (success) {
        addToast({
          type: "success",
          message: "Successfully funded! 10,000 XLM added to your balance.",
        });
        // Reload details to show updated balance
        await loadWalletDetails(true);
      } else {
        addToast({
          type: "error",
          message: "Stellar Friendbot failed to fund this account.",
        });
      }
    } catch {
      addToast({
        type: "error",
        message: "Failed to fund testnet account.",
      });
    } finally {
      setIsFunding(false);
    }
  };

  if (!isConnected || !publicKey) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-darkblue-dark flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Redirecting to connection prompt...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkblue-dark flex flex-col">
      <Header />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              Wallet Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your connected account assets, transactions, and Quick Actions.
            </p>
          </div>
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => loadWalletDetails()}
              disabled={isLoadingDetails}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Refresh Wallet Details"
              aria-label="Refresh wallet data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDetails ? "animate-spin" : ""}`} />
            </button>
            <div className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue">
              <NetworkBadge />
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left / Top - Wallet Account Details Card */}
          <div className="lg:col-span-1 bg-white dark:bg-darkblue rounded-3xl border border-gray-200 dark:border-white/10 p-6 shadow-xl relative overflow-hidden group">
            {/* Ambient Background Lights */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/50">
                    Stellar Account
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-sm font-semibold text-gray-800 dark:text-white">
                      {shortenAddress(publicKey)}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                      title="Copy Address"
                      aria-label="Copy wallet address to clipboard"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* XLM Balance Display */}
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/50 block">
                Total Balance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                {balance === null ? (
                  <div className="h-9 w-24 bg-gray-200 dark:bg-white/10 animate-pulse rounded-md" />
                ) : (
                  <span className="text-3xl font-extrabold text-gray-900 dark:text-white tabular-nums tracking-tight">
                    {balance}
                  </span>
                )}
                <span className="text-sm font-bold text-primary tracking-wide">XLM</span>
              </div>
            </div>

            {/* Quick Stats/Properties */}
            <div className="pt-5 border-t border-gray-100 dark:border-white/5 space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-gray-500 dark:text-white/60">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Core Network
                </span>
                <span className="font-semibold text-gray-800 dark:text-white capitalize">
                  {activeNetwork}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-500 dark:text-white/60">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Last Synced
                </span>
                <span className="font-semibold text-gray-800 dark:text-white">
                  {isLoadingDetails ? "Syncing..." : "Just now"}
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right - Quick Actions */}
          <div className="lg:col-span-2 bg-white dark:bg-darkblue rounded-3xl border border-gray-200 dark:border-white/10 p-6 shadow-xl relative overflow-hidden">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Action: Verify Authenticity */}
              <button
                onClick={() => router.push("/verify")}
                className="group flex flex-col items-start p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-left transition-all duration-300 hover:bg-primary/5 hover:border-primary/20 dark:hover:bg-primary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <FileCheck className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Verify Authenticity
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  Verify file checksums against registered contract credentials.
                </p>
              </button>

              {/* Action: My Products */}
              <button
                onClick={() => router.push("/vault")}
                className="group flex flex-col items-start p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 text-left transition-all duration-300 hover:bg-secondary/5 hover:border-secondary/20 dark:hover:bg-secondary/10"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <FolderKanban className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  My Products
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                  Manage your encrypted assets stored in the Secret Provenance Vault.
                </p>
              </button>

              {/* Action: Fund Testnet (Testnet Only) */}
              {activeNetwork === "testnet" ? (
                <button
                  onClick={handleFundTestnet}
                  disabled={isFunding}
                  className="group flex flex-col items-start p-5 rounded-2xl border border-amber-500/10 dark:border-amber-500/20 bg-amber-500/5 text-left transition-all duration-300 hover:bg-amber-500/10 hover:border-amber-500/30 disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                    <RefreshCw className={`w-5 h-5 text-amber-500 ${isFunding ? "animate-spin" : ""}`} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    Fund Testnet
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                    Instantly request 10,000 testnet XLM from the Friendbot faucet to your address.
                  </p>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 opacity-60">
                  <span className="text-xs text-gray-400 text-center leading-normal">
                    Faucet is only available on Stellar Testnet network.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Panel */}
        <div className="bg-white dark:bg-darkblue rounded-3xl border border-gray-200 dark:border-white/10 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Transactions
            </h2>
            <span className="text-xs text-gray-400 dark:text-white/50">
              Showing 5 most recent
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {isLoadingDetails ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Fetching recent transactions...
                </span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <Activity className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">
                  No Transactions Found
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                  There are no registered transactions on the network for this account yet.
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 dark:text-white/40 text-left uppercase tracking-wider">
                    <th className="pb-3 pr-4">Tx Hash</th>
                    <th className="pb-3 px-4">Date & Time</th>
                    <th className="pb-3 px-4">Ledger</th>
                    <th className="pb-3 px-4 text-center">Status</th>
                    <th className="pb-3 pl-4 text-right">Fee (Charged)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.hash}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Hash */}
                      <td className="py-4 pr-4 font-mono text-xs font-medium text-gray-800 dark:text-white flex items-center gap-1.5">
                        {shortenAddress(tx.hash)}
                        <a
                          href={`https://stellar.expert/explorer/${activeNetwork === "mainnet" ? "public" : activeNetwork
                            }/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-primary hover:bg-primary/10 transition-colors"
                          title="View transaction on Stellar Expert"
                          aria-label={`View transaction ${tx.hash} on explorer`}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 text-gray-500 dark:text-white/60 tabular-nums">
                        {new Date(tx.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Ledger */}
                      <td className="py-4 px-4 font-mono text-xs text-gray-500 dark:text-white/60 tabular-nums">
                        {tx.ledger}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tx.successful
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                        >
                          {tx.successful ? "Success" : "Failed"}
                        </span>
                      </td>

                      {/* Fee */}
                      <td className="py-4 pl-4 text-right font-mono text-xs text-gray-500 dark:text-white/60 tabular-nums">
                        {parseFloat(tx.fee) / 10000000} XLM
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
