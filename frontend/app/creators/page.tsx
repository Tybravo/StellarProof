"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Search, Users, X } from "lucide-react";
import Header from "@/components/Header";
import { cn } from "@/utils/cn";
import CreatorCard from "./components/CreatorCard";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { fetchCreators, mergeCreators } from "./services/creatorService";
import type { Creator } from "./types";

/** Debounce delay between keystrokes and the actual directory request (ms). */
const SEARCH_DEBOUNCE_MS = 300;

/** Placeholder cards rendered while the first page is in flight. */
const SKELETON_COUNT = 6;

/** True when a rejected promise stemmed from an intentional abort. */
function isAbortError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "name" in err && (err as Error).name === "AbortError";
}

function CreatorCardSkeleton() {
  return (
    <li
      data-testid="creator-card-skeleton"
      className="h-36 animate-pulse rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5"
    />
  );
}

/**
 * Creator Directory.
 *
 * Lists the creators behind the certificates indexed on the StellarProof
 * network. Creators are loaded a page at a time and appended as the user
 * reaches the bottom of the list (Intersection Observer), so the page never
 * renders more cards than the visitor has actually scrolled to. A manual
 * "Load more" button mirrors the same action for keyboard users and for
 * browsers without Intersection Observer support.
 */
export default function CreatorsPage() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [hasMore, setHasMore] = useState(false);
  // Start in loading state so the first paint shows the skeleton.
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Bumped by the retry button to re-run the loader for the current page. */
  const [retryToken, setRetryToken] = useState(0);

  /* ---------------------------------------------------------------- */
  /*                     Debounce the search input                    */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) return;

    const timer = window.setTimeout(() => {
      // Applying a new query restarts pagination from the first page.
      setAppliedQuery(trimmed);
      setPage(0);
      setLoadingInitial(true);
      setError(null);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, appliedQuery]);

  /* ---------------------------------------------------------------- */
  /*              Load the current page of the directory              */
  /* ---------------------------------------------------------------- */
  // The loading flags are raised by whatever triggers a load (mount, a new
  // query, "load more", retry) rather than inside this effect, so the effect
  // body never dispatches a synchronous setState.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetchCreators({
      page,
      search: appliedQuery || undefined,
      signal: controller.signal,
    })
      .then((result) => {
        if (cancelled) return;
        setCreators((previous) =>
          page === 0 ? result.creators : mergeCreators(previous, result.creators)
        );
        setHasMore(result.hasMore);
      })
      .catch((err: unknown) => {
        if (cancelled || isAbortError(err)) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load the creator directory. Please try again."
        );
        // Stop the observer from retrying the same failing page in a loop.
        setHasMore(false);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingInitial(false);
        setLoadingMore(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [appliedQuery, page, retryToken]);

  /* ---------------------------------------------------------------- */
  /*                          Infinite scroll                         */
  /* ---------------------------------------------------------------- */
  const busy = loadingInitial || loadingMore;

  const handleLoadMore = useCallback(() => {
    setPage((current) => current + 1);
    setLoadingMore(true);
    setError(null);
  }, []);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    enabled: hasMore && !busy && error === null,
  });

  const handleRetry = useCallback(() => {
    setRetryToken((token) => token + 1);
    setError(null);
    if (page === 0) setLoadingInitial(true);
    else setLoadingMore(true);
  }, [page]);

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setAppliedQuery("");
    setPage(0);
    setLoadingInitial(true);
    setError(null);
  }, []);

  const showEmptyState = !busy && error === null && creators.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Creator Directory
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-500 dark:text-gray-400">
            Browse the creators anchoring their work on the Stellar network.
          </p>
        </div>

        {/* Search */}
        <div className="mx-auto mb-10 max-w-xl">
          <label htmlFor="creator-search" className="sr-only">
            Search creators
          </label>
          <form 
            className="relative"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="creator-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, wallet address or asset…"
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue py-3 pl-10 pr-10 text-sm text-gray-900 dark:text-white placeholder-gray-400 shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {query !== "" && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </form>
        </div>

        {/* Result summary, announced to assistive tech */}
        <p
          role="status"
          aria-live="polite"
          className="mb-4 text-sm text-gray-500 dark:text-gray-400"
        >
          {loadingInitial
            ? "Loading creators…"
            : `${creators.length} ${
                creators.length === 1 ? "creator" : "creators"
              } loaded`}
        </p>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              {error}
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Directory */}
        <ul
          aria-label="Creators"
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {creators.map((creator) => (
            <CreatorCard key={creator.address} creator={creator} />
          ))}

          {loadingInitial &&
            Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <CreatorCardSkeleton key={`skeleton-${index}`} />
            ))}
        </ul>

        {showEmptyState && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/10 py-16 text-center">
            <Users
              className="mx-auto mb-3 h-8 w-8 text-gray-400"
              aria-hidden="true"
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {appliedQuery
                ? `No creators match “${appliedQuery}”.`
                : "No creators have been indexed yet."}
            </p>
          </div>
        )}

        {/* Sentinel: entering the viewport requests the next page. */}
        {hasMore && !error && (
          <div
            ref={sentinelRef}
            data-testid="infinite-scroll-sentinel"
            aria-hidden="true"
            className="h-px w-full"
          />
        )}

        {loadingMore && (
          <p className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading more creators…
          </p>
        )}

        {/* Keyboard-accessible fallback for the observer. */}
        {hasMore && !busy && !error && (
          <div className="flex justify-center py-8">
            <button
              type="button"
              onClick={handleLoadMore}
              className={cn(
                "rounded-lg border border-gray-300 dark:border-white/10 px-5 py-2.5 text-sm font-semibold",
                "text-gray-700 dark:text-gray-300 transition-colors hover:border-primary hover:text-primary"
              )}
            >
              Load more
            </button>
          </div>
        )}

        {!hasMore && !busy && !error && creators.length > 0 && (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            You have reached the end of the directory.
          </p>
        )}
      </main>
    </div>
  );
}