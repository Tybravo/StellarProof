"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { searchCertificates } from "@/app/search/services/searchService";
import type { SearchResult } from "@/app/search/types";
import { cn } from "@/utils/cn";

export interface GlobalSearchBarProps {
  /** Input placeholder text. */
  placeholder?: string;
  /** Optional wrapper class name. */
  className?: string;
  /** Debounce delay in ms before querying the certificates index. */
  debounceMs?: number;
  /** Optional custom search function (defaults to `searchCertificates`). */
  onSearch?: (
    query: string,
    options?: { signal?: AbortSignal },
  ) => Promise<SearchResult[]>;
  /** Optional callback when a result link is selected. */
  onSelectResult?: (result: SearchResult) => void;
  /** Optional callback when the user submits the search form. */
  onSubmit?: (query: string) => void;
  /** Optional navigation handler used on form submission. */
  onNavigate?: (url: string) => void;
}

const DEFAULT_DEBOUNCE_MS = 300;
const MAX_DROPDOWN_RESULTS = 6;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

function truncateHash(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}

/**
 * Global navbar search bar for looking up StellarProof certificate hashes and IDs.
 *
 * Performs debounced, abortable lookups against the certificates index,
 * displaying loading, error, empty, and interactive result states in an
 * accessible dropdown listbox.
 */
export function GlobalSearchBar({
  placeholder = "Search certificate hash or ID…",
  className,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onSearch,
  onSelectResult,
  onSubmit,
  onNavigate,
}: GlobalSearchBarProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);

  const trimmedQuery = query.trim();

  const runSearch = useCallback(
    (q: string, signal: AbortSignal) => {
      if (onSearch) {
        return onSearch(q, { signal });
      }
      return searchCertificates(q, { signal, limit: MAX_DROPDOWN_RESULTS });
    },
    [onSearch],
  );

  // Close dropdown when clicking outside the search bar container.
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Debounced certificate hash lookup.
  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      runSearch(trimmedQuery, controller.signal)
        .then((data) => {
          if (cancelled) return;
          setResults(data.slice(0, MAX_DROPDOWN_RESULTS));
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled || isAbortError(err)) return;
          const message =
            err instanceof Error && err.message
              ? err.message
              : "Failed to look up certificate hash. Please try again.";
          setError(message);
          setResults([]);
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmedQuery, debounceMs, runSearch, retryCounter]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setQuery(next);
    setError(null);

    if (!next.trim()) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setIsLoading(false);
    setIsOpen(false);
  };

  const handleRetry = () => {
    if (!trimmedQuery) return;
    setError(null);
    setIsLoading(true);
    setIsOpen(true);
    setRetryCounter((c) => c + 1);
  };

  const navigateTo = (url: string) => {
    if (onNavigate) {
      onNavigate(url);
      return;
    }
    if (typeof window !== "undefined") {
      window.location.assign(url);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedQuery) return;

    setIsOpen(false);
    if (onSubmit) {
      onSubmit(trimmedQuery);
      return;
    }

    const normalized = trimmedQuery.toLowerCase();
    const exactMatch = results.find(
      (item) =>
        item.hash.toLowerCase() === normalized ||
        item.id.toLowerCase() === normalized,
    );

    const target = exactMatch ?? (results.length === 1 ? results[0] : null);
    if (target) {
      onSelectResult?.(target);
      navigateTo(`/certificate/${encodeURIComponent(target.id)}`);
      return;
    }

    navigateTo(`/search?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && trimmedQuery.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        aria-label="Certificate hash lookup"
        onSubmit={handleSubmit}
        className="relative"
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (trimmedQuery) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search certificate hashes"
          aria-controls={showDropdown ? listboxId : undefined}
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          className={cn(
            "w-full rounded-xl border border-gray-200 dark:border-white/15",
            "bg-gray-50 dark:bg-white/5 py-2 pl-9 pr-9 text-sm",
            "text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400",
            "focus:border-primary focus:bg-white dark:focus:bg-darkblue focus:outline-none focus:ring-2 focus:ring-primary/30",
            "transition-colors",
          )}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2
              className="h-4 w-4 text-primary animate-spin"
              role="status"
              aria-label="Searching certificates"
            />
          ) : (
            query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                title="Clear search"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Certificate search results"
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-darkblue/95 shadow-xl backdrop-blur-md overflow-hidden"
        >
          {isLoading && (
            <div className="flex items-center gap-2.5 px-4 py-3 text-xs text-gray-500 dark:text-gray-300">
              <Loader2
                className="h-4 w-4 text-primary animate-spin shrink-0"
                aria-hidden="true"
              />
              <span>Searching certificate index…</span>
            </div>
          )}

          {!isLoading && error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-red-600 dark:text-red-300 bg-red-50/70 dark:bg-red-950/30"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{error}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="shrink-0 font-semibold text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && results.length === 0 && (
            <div className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
              No certificates found for{" "}
              <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                {trimmedQuery}
              </span>
              .
            </div>
          )}

          {!isLoading && !error && results.length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-white/10 max-h-72 overflow-y-auto">
              {results.map((item) => (
                <li key={item.id} role="option" aria-selected={false}>
                  <Link
                    href={`/certificate/${encodeURIComponent(item.id)}`}
                    onClick={() => {
                      setIsOpen(false);
                      onSelectResult?.(item);
                    }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                        {item.name || item.id}
                      </p>
                      <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                        {item.hash ? truncateHash(item.hash) : item.id}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                        item.status === "verified"
                          ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                      )}
                    >
                      {item.status === "verified" ? (
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Clock className="h-3 w-3" aria-hidden="true" />
                      )}
                      {item.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.03] px-4 py-2">
            <Link
              href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between text-[11px] font-medium text-primary hover:text-primary-dark dark:hover:text-blue-300 transition-colors"
            >
              <span>Open full certificate search</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalSearchBar;
