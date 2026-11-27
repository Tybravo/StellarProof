"use client";

import { ExternalLink, Loader2, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer";

interface ConnectWalletButtonProps {
  className?: string;
}

/**
 * Connect button that degrades gracefully when the Freighter extension is
 * missing: instead of failing silently it renders a link to the download page.
 */
export function ConnectWalletButton({ className = "" }: ConnectWalletButtonProps) {
  const { status, connect, connectError, clearError, installUrl } = useWallet();

  if (status === "connected") return null;

  if (status === "not-installed") {
    return (
      <div className={`flex flex-col items-start gap-2 ${className}`} data-testid="freighter-missing">
        <p className="text-sm text-gray-600 dark:text-gray-300" role="status">
          Freighter wallet was not detected. Install the extension, then refresh this page.
        </p>
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnBase} bg-primary text-white`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Install Freighter
        </a>
      </div>
    );
  }

  const busy = status === "connecting" || status === "checking";

  return (
    <div className={`flex flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={busy}
        className={`${btnBase} bg-primary text-white`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Wallet className="h-4 w-4" aria-hidden="true" />
        )}
        {status === "connecting" ? "Connecting…" : status === "checking" ? "Detecting wallet…" : "Connect Wallet"}
      </button>
      {connectError && (
        <div role="alert" className="flex items-center gap-2 text-xs text-red-500">
          <span>{connectError}</span>
          <button type="button" onClick={clearError} className="underline">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
