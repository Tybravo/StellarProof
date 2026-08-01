/**
 * Non-happy-path UI states for the Global Certificate Search page:
 * idle prompt, zero-results, and API error (with retry).
 *
 * @see Issue #377 – Integrate Soroban/Backend Search API for Global Certificate Search
 */
"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Search as SearchIcon, SearchX } from "lucide-react";

/* ------------------------------------------------------------------ */
/*                            Error state                              */
/* ------------------------------------------------------------------ */

export function SearchErrorState({
  message,
  onRetry,
  isRetrying = false,
}: {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      role="alert"
      data-testid="search-error"
      className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-500/30 dark:bg-red-950/20"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-red-800 dark:text-red-200">
          Search failed
        </h3>
        <p className="mx-auto max-w-md text-sm text-red-700 dark:text-red-300">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} aria-hidden />
        {isRetrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                          No-results state                           */
/* ------------------------------------------------------------------ */

export function SearchEmptyState({
  query,
  hasFilters,
  onClearFilters,
}: {
  query: string;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div
      data-testid="search-empty"
      className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/5">
        <SearchX className="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          No certificates found
        </h3>
        <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-gray-400">
          {query ? (
            <>
              Nothing matched{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                “{query}”
              </span>
              . Try a different content hash, certificate ID, or creator address.
            </>
          ) : (
            "No certificates match the selected filters."
          )}
        </p>
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:border-primary dark:hover:text-primary"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Idle state                               */
/* ------------------------------------------------------------------ */

const EXAMPLE_QUERIES = ["photography", "sha256:", "SP-CERT-000148", "document"];

export function SearchIdleState({
  onExample,
}: {
  onExample: (value: string) => void;
}) {
  return (
    <div
      data-testid="search-idle"
      className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <SearchIcon className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Search the global certificate registry
        </h3>
        <p className="mx-auto max-w-md text-sm text-gray-500 dark:text-gray-400">
          Look up any provenance certificate minted on Stellar by content hash,
          manifest hash, certificate ID, creator address, or title.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">Try:</span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onExample(example)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 font-mono text-xs text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:border-primary dark:hover:text-primary"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
