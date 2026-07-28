/**
 * Shared presentational primitives for the Global Certificate Search results.
 * Used by both ListView and GridView so the two stay visually consistent.
 *
 * @see Issue #377 – Integrate Soroban/Backend Search API for Global Certificate Search
 */
"use client";

import React, { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../../utils/cn";
import type { CertificateStatus } from "../../../services/searchService";

/* ------------------------------------------------------------------ */
/*                            Formatters                               */
/* ------------------------------------------------------------------ */

/** Middle-truncates long hashes / Stellar addresses: `abcd…wxyz`. */
export function truncateMiddle(value: string, head = 8, tail = 6): string {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

/* ------------------------------------------------------------------ */
/*                           Status badge                              */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<CertificateStatus, string> = {
  verified:
    "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30",
  pending:
    "bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30",
  revoked:
    "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
};

const STATUS_LABELS: Record<CertificateStatus, string> = {
  verified: "Verified",
  pending: "Pending",
  revoked: "Revoked",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CertificateStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        STATUS_STYLES[status],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "verified" && "bg-green-500",
          status === "pending" && "bg-yellow-500",
          status === "revoked" && "bg-red-500"
        )}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*                           Network badge                             */
/* ------------------------------------------------------------------ */

export function NetworkBadge({ network }: { network: "testnet" | "mainnet" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        network === "mainnet"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-secondary/30 bg-secondary/10 text-secondary"
      )}
    >
      {network}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*                          Copyable hash                              */
/* ------------------------------------------------------------------ */

export function CopyHash({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        /* clipboard unavailable – silent fail */
      }
    },
    [value]
  );

  if (!value) return null;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value}
      aria-label={`Copy ${label}`}
      className={cn(
        "group/copy inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:text-gray-400",
        "transition-colors hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10 dark:hover:text-primary",
        className
      )}
    >
      <span className="truncate">{truncateMiddle(value, 10, 8)}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-green-500" aria-hidden />
      ) : (
        <Copy
          className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/copy:opacity-100"
          aria-hidden
        />
      )}
      <span className="sr-only">{copied ? "Copied" : ""}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                       Inline loading spinner                        */
/* ------------------------------------------------------------------ */

export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <svg
        className={cn("h-4 w-4 animate-spin text-primary", className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        data-testid="search-spinner"
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
