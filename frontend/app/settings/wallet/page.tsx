"use client";

import React, { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import { AuthApiError } from "@/services/auth";

function truncate(key: string) {
  return `${key.slice(0, 6)}...${key.slice(-6)}`;
}

function LinkWalletSettings() {
  const { user, linkWallet } = useAuth();
  const { publicKey, isConnected, isConnecting, isFreighterInstalled, connectError, connect } =
    useWallet();
  const { addToast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const linkedKey = user?.stellarPublicKey ?? null;
  const alreadyLinked = !!linkedKey && linkedKey === publicKey;

  const handleLink = async () => {
    if (!publicKey) return;
    setIsLinking(true);
    setLinkError(null);
    try {
      await linkWallet(publicKey);
      addToast({ type: "success", message: "Wallet linked to your account" });
    } catch (err) {
      const message =
        err instanceof AuthApiError ? err.message : "Failed to link wallet. Please try again.";
      setLinkError(message);
      addToast({ type: "error", message });
    } finally {
      setIsLinking(false);
    }
  };

  const buttonClass =
    "rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Link Wallet</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Connect your Freighter wallet and link it to {user?.email ?? "your account"}.
      </p>

      <section
        aria-labelledby="linked-wallet-heading"
        className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
      >
        <h2 id="linked-wallet-heading" className="text-sm font-semibold">
          Linked wallet
        </h2>
        {linkedKey ? (
          <p className="mt-2 break-all font-mono text-sm" data-testid="linked-key">
            {linkedKey}
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No wallet is linked to this account yet.
          </p>
        )}
      </section>

      <section
        aria-labelledby="freighter-heading"
        className="mt-4 space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
      >
        <h2 id="freighter-heading" className="text-sm font-semibold">
          Freighter
        </h2>

        {isFreighterInstalled === false && (
          <p role="alert" className="text-sm text-red-500">
            Freighter was not detected. Install the extension and reload this page.
          </p>
        )}

        {isConnected && publicKey ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Connected as <span className="font-mono">{truncate(publicKey)}</span>
          </p>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={isConnecting}
            aria-busy={isConnecting}
            className={buttonClass}
          >
            {isConnecting ? "Connecting..." : "Connect Freighter"}
          </button>
        )}

        {connectError && (
          <p role="alert" className="text-sm text-red-500">
            {connectError}
          </p>
        )}

        {isConnected && publicKey && (
          <button
            type="button"
            onClick={handleLink}
            disabled={isLinking || alreadyLinked}
            aria-busy={isLinking}
            className={buttonClass}
          >
            {alreadyLinked
              ? "Wallet linked"
              : isLinking
                ? "Linking..."
                : linkedKey
                  ? "Replace linked wallet"
                  : "Link wallet to account"}
          </button>
        )}

        {linkError && (
          <p role="alert" className="text-sm text-red-500">
            {linkError}
          </p>
        )}
      </section>
    </main>
  );
}

export default function WalletSettingsPage() {
  return (
    <AuthGuard>
      <LinkWalletSettings />
    </AuthGuard>
  );
}
