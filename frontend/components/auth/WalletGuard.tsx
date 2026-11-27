"use client";

import type { ReactNode } from "react";
import { Loader2, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";

interface WalletGuardProps {
  children: ReactNode;
  /** Optional custom content shown instead of the default connect prompt. */
  fallback?: ReactNode;
}

/**
 * Gates its children behind a connected Freighter wallet. Unconnected users
 * see a prompt to connect (or to install Freighter if it is missing).
 */
export function WalletGuard({ children, fallback }: WalletGuardProps) {
  const { status } = useWallet();

  if (status === "connected") return <>{children}</>;

  if (status === "checking") {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Checking wallet…
      </div>
    );
  }

  if (fallback) return <>{fallback}</>;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-gray-200 p-8 text-center dark:border-gray-800">
      <Wallet className="h-8 w-8 text-primary" aria-hidden="true" />
      <h2 className="text-lg font-semibold">Connect your wallet to continue</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        A connected Freighter wallet is required to access verification workflows.
      </p>
      <ConnectWalletButton className="items-center" />
    </div>
  );
}
