"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  Search,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import type { SearchResultStatus } from "../types";

/* ------------------------------------------------------------------ */
/*                          Hash / Date helpers                       */
/* ------------------------------------------------------------------ */

/** Middle-truncate a hash for compact display (e.g. `0x1a2b…f0e1`). */
export function truncateHash(hash?: string, head = 6, tail = 6): string {
  if (!hash) return "—";
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Truncate a Stellar-style wallet address (e.g. `GBVBK…QBXP`). */
export function truncateAddress(
  address?: string,
  head = 6,
  tail = 4,
): string {
  if (!address) return "—";
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

/** Safely format an ISO date string for display. */
export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------------------------------------------ */
/*                            Constants                               */
/* ------------------------------------------------------------------ */

export const STATUS_LABEL: Record<SearchResultStatus, string> = {
  verified: "Verified",
  pending: "Pending",
  failed: "Failed",
};

export const STATUS_BADGE_CLASS: Record<SearchResultStatus, string> = {
  verified:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  pending:
    "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
};

export const STATUS_ICON_BIG: Record<SearchResultStatus, React.ReactNode> = {
  verified: <ShieldCheck className="w-5 h-5" aria-hidden />,
  pending: <Loader2 className="w-5 h-5 animate-spin" aria-hidden />,
  failed: <ShieldAlert className="w-5 h-5" aria-hidden />,
};

export const STATUS_ICON_SMALL: Record<SearchResultStatus, React.ReactNode> = {
  verified: <ShieldCheck className="w-4 h-4" aria-hidden />,
  pending: <Loader2 className="w-4 h-4 animate-spin" aria-hidden />,
  failed: <ShieldAlert className="w-4 h-4" aria-hidden />,
};

/* ------------------------------------------------------------------ */
/*                        Shared components                           */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status }: { status: SearchResultStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        STATUS_BADGE_CLASS[status],
      )}
      aria-label={`Status: ${STATUS_LABEL[status]}`}
    >
      {STATUS_ICON_SMALL[status]}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function CopyButton({
  value,
  label,
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (
      event:
        | React.MouseEvent<HTMLButtonElement>
        | React.KeyboardEvent,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API unavailable.
      }
    },
    [value],
  );

  if (!value) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-300 dark:text-gray-600 cursor-not-allowed"
        aria-label="No hash to copy"
      >
        <Copy className="w-3.5 h-3.5" aria-hidden />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={
        copied
          ? `${label ?? "Hash"} copied`
          : `Copy ${label ?? "hash"} to clipboard`
      }
      title={copied ? "Copied!" : "Copy hash"}
      className={cn(
        "relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors",
        "text-gray-400 dark:text-gray-500",
        "hover:text-primary dark:hover:text-primary-light hover:bg-primary/10 dark:hover:bg-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <Check className="w-3.5 h-3.5 text-green-500" aria-hidden />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="inline-flex"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        "rounded-2xl border-2 border-dashed",
        "border-gray-200 dark:border-white/10",
        "bg-gray-50/50 dark:bg-white/[0.02]",
      )}
      role="status"
    >
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <Search className="w-6 h-6 text-gray-400" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
        Nothing to show
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
        {message}
      </p>
    </div>
  );
}
