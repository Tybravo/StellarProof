/**
 * Global Certificate Search
 * ---------------------------------------------------------------------------
 * Connects the search UI to the StellarProof backend / Soroban-indexed
 * certificate API.
 *
 *   • Data fetching  → `services/searchService.ts` (fetch + AbortController)
 *   • React hook     → `hooks/useCertificateSearch.ts` (debounce, loading,
 *                       error, race-condition safety, retry)
 *   • Presentation   → `./components/ListView` and `./components/GridView`
 *
 * URL state (`?q=`, `?view=`, `?status=`, `?network=`, `?sort=`, `?page=`) is
 * the single source of truth so results are shareable and survive reloads.
 * `useSearchParams()` is wrapped in a <Suspense> boundary as required by the
 * repo guidelines (see .context/DEVELOPMENT_GUIDELINES.md).
 *
 * @see Issue #377 – Integrate Soroban/Backend Search API for Global Certificate Search
 */
"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutGrid,
  List as ListIcon,
  Search as SearchIcon,
  X,
} from "lucide-react";
import Header from "../../components/Header";
import { cn } from "../../utils/cn";
import { useCertificateSearch } from "../../hooks/useCertificateSearch";
import {
  DEFAULT_PAGE_SIZE,
  type NetworkFilter,
  type SortOption,
  type StatusFilter,
} from "../../services/searchService";
import ListView, { ListViewSkeleton } from "./components/ListView";
import GridView, { GridViewSkeleton } from "./components/GridView";
import {
  SearchEmptyState,
  SearchErrorState,
  SearchIdleState,
} from "./components/SearchStates";
import { Spinner } from "./components/shared";

/* ------------------------------------------------------------------ */
/*                              Constants                              */
/* ------------------------------------------------------------------ */

type ViewMode = "list" | "grid";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "pending", label: "Pending" },
  { value: "revoked", label: "Revoked" },
];

const NETWORK_OPTIONS: { value: NetworkFilter; label: string }[] = [
  { value: "all", label: "All networks" },
  { value: "mainnet", label: "Mainnet" },
  { value: "testnet", label: "Testnet" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

/* ------------------------------------------------------------------ */
/*                           URL param helpers                         */
/* ------------------------------------------------------------------ */

function parseView(raw: string | null): ViewMode {
  return raw === "grid" ? "grid" : "list";
}

function parseStatus(raw: string | null): StatusFilter {
  return raw === "verified" || raw === "pending" || raw === "revoked" ? raw : "all";
}

function parseNetwork(raw: string | null): NetworkFilter {
  return raw === "mainnet" || raw === "testnet" ? raw : "all";
}

function parseSort(raw: string | null): SortOption {
  return raw === "newest" || raw === "oldest" ? raw : "relevance";
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/* ------------------------------------------------------------------ */
/*                         Pagination control                          */
/* ------------------------------------------------------------------ */

function Pagination({
  page,
  totalPages,
  onPage,
  disabled,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav
      aria-label="Search results pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={disabled || page <= 1}
        aria-label="Previous page"
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {start > 1 && (
        <span className="px-1 text-xs text-gray-400" aria-hidden>
          …
        </span>
      )}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPage(p)}
          disabled={disabled}
          aria-label={`Go to page ${p}`}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "h-8 w-8 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed",
            p === page
              ? "bg-primary text-white shadow-button-glow"
              : "text-gray-600 hover:bg-primary/5 hover:text-primary dark:text-gray-300"
          )}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <span className="px-1 text-xs text-gray-400" aria-hidden>
          …
        </span>
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={disabled || page >= totalPages}
        aria-label="Next page"
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*                      Inner page (uses searchParams)                 */
/* ------------------------------------------------------------------ */

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── URL-derived state ───────────────────────────────────────────────
  const urlQuery = searchParams.get("q") ?? "";
  const view = parseView(searchParams.get("view"));
  const status = parseStatus(searchParams.get("status"));
  const network = parseNetwork(searchParams.get("network"));
  const sort = parseSort(searchParams.get("sort"));
  const page = parsePage(searchParams.get("page"));

  // Local input mirrors the URL but updates instantly while typing.
  const [inputValue, setInputValue] = useState(urlQuery);

  // Keep the input in sync with browser back/forward navigation.
  // Render-time state adjustment avoids a setState-in-effect cascade.
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setInputValue(urlQuery);
  }

  const inputRef = useRef<HTMLInputElement>(null);

  /** Writes a partial patch of params back to the URL. */
  const updateParams = useCallback(
    (patch: Record<string, string | null>, opts: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      if (opts.resetPage) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Push the typed query into the URL (debounced) so it stays shareable.
  // The actual network debounce lives in useCertificateSearch.
  useEffect(() => {
    if (inputValue === urlQuery) return;
    const timer = setTimeout(() => {
      updateParams({ q: inputValue || null }, { resetPage: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [inputValue, urlQuery, updateParams]);

  // ── Data fetching ───────────────────────────────────────────────────
  const {
    data,
    total,
    totalPages,
    source,
    isLoading,
    isFetching,
    error,
    isEmpty,
    hasSearched,
    retry,
  } = useCertificateSearch({
    query: inputValue,
    page,
    limit: DEFAULT_PAGE_SIZE,
    status,
    network,
    sort,
  });

  const hasActiveFilters = status !== "all" || network !== "all" || sort !== "relevance";
  const isIdle = !inputValue.trim() && !hasActiveFilters && !hasSearched;

  const handleClearQuery = useCallback(() => {
    setInputValue("");
    updateParams({ q: null }, { resetPage: true });
    inputRef.current?.focus();
  }, [updateParams]);

  const handleClearFilters = useCallback(() => {
    updateParams({ status: null, network: null, sort: null }, { resetPage: true });
  }, [updateParams]);

  const handleExample = useCallback(
    (value: string) => {
      setInputValue(value);
      updateParams({ q: value }, { resetPage: true });
    },
    [updateParams]
  );

  const handlePage = useCallback(
    (p: number) => {
      updateParams({ page: p > 1 ? String(p) : null });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateParams]
  );

  const resultLabel = useMemo(() => {
    if (isLoading) return "Searching…";
    if (error) return "Search failed";
    if (total === 0) return "No results";
    return `${total.toLocaleString()} certificate${total === 1 ? "" : "s"}`;
  }, [isLoading, error, total]);

  /* ---------------------------------------------------------------- */
  /*                             Render                                */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-primary/30 dark:bg-[#020617]">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* ── Page header ── */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Certificate Search
          </h1>
          <p className="mt-2 max-w-2xl text-base text-gray-500 dark:text-gray-400">
            Search every provenance certificate anchored on the Stellar network by
            content hash, manifest hash, certificate ID, or creator address.
          </p>
        </header>

        {/* ── Search bar ── */}
        <div className="relative mb-4">
          <SearchIcon
            className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            role="searchbox"
            aria-label="Search certificates"
            placeholder="Search by content hash, certificate ID, creator address…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-white py-3.5 pl-11 pr-24 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500"
          />
          <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
            {isFetching && <Spinner label="Searching" />}
            {inputValue && (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label="Clear search"
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Filters + view toggle ── */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status chips */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateParams({ status: opt.value === "all" ? null : opt.value }, { resetPage: true })}
                  aria-pressed={status === opt.value}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    status === opt.value
                      ? "border-primary bg-primary text-white shadow-button-glow"
                      : "border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-gray-400"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Network select */}
            <label className="sr-only" htmlFor="network-filter">
              Filter by network
            </label>
            <select
              id="network-filter"
              value={network}
              onChange={(e) =>
                updateParams(
                  { network: e.target.value === "all" ? null : e.target.value },
                  { resetPage: true }
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
            >
              {NETWORK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Sort select */}
            <label className="sr-only" htmlFor="sort-filter">
              Sort results
            </label>
            <select
              id="sort-filter"
              value={sort}
              onChange={(e) =>
                updateParams(
                  { sort: e.target.value === "relevance" ? null : e.target.value },
                  { resetPage: true }
                )
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-medium text-primary transition-colors hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 self-start rounded-xl border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-white/5 lg:self-auto"
            role="group"
            aria-label="Result view mode"
          >
            <button
              type="button"
              onClick={() => updateParams({ view: null })}
              aria-pressed={view === "list"}
              aria-label="List view"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:text-primary dark:text-gray-400"
              )}
            >
              <ListIcon className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
            <button
              type="button"
              onClick={() => updateParams({ view: "grid" })}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                view === "grid"
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:text-primary dark:text-gray-400"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Grid
            </button>
          </div>
        </div>

        {/* ── Result meta bar ── */}
        {!isIdle && (
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-white/10">
            <p
              className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
              role="status"
              aria-live="polite"
            >
              {isLoading && <Spinner label="Loading results" />}
              <span>{resultLabel}</span>
              {inputValue.trim() && !isLoading && !error && (
                <span className="text-gray-400 dark:text-gray-500">
                  for “{inputValue.trim()}”
                </span>
              )}
            </p>
            {source === "mock" && (
              <span
                title="No NEXT_PUBLIC_API_URL configured — showing local sample data."
                className="hidden items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300 sm:inline-flex"
              >
                <Database className="h-3 w-3" aria-hidden />
                Sample data
              </span>
            )}
          </div>
        )}

        {/* ── Results region ── */}
        <section aria-label="Search results" aria-busy={isFetching}>
          {isIdle ? (
            <SearchIdleState onExample={handleExample} />
          ) : error ? (
            <SearchErrorState message={error} onRetry={retry} isRetrying={isFetching} />
          ) : isLoading ? (
            view === "grid" ? (
              <GridViewSkeleton cards={DEFAULT_PAGE_SIZE} />
            ) : (
              <ListViewSkeleton rows={6} />
            )
          ) : isEmpty ? (
            <SearchEmptyState
              query={inputValue.trim()}
              hasFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          ) : (
            <div
              className={cn(
                "transition-opacity duration-200",
                isFetching && "pointer-events-none opacity-60"
              )}
            >
              {view === "grid" ? (
                <GridView certificates={data} />
              ) : (
                <ListView certificates={data} />
              )}
            </div>
          )}
        </section>

        {/* ── Pagination ── */}
        {!isIdle && !error && !isLoading && data.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={handlePage}
            disabled={isFetching}
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                   Suspense fallback (build-safe)                    */
/* ------------------------------------------------------------------ */

function SearchPageFallback() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans dark:bg-[#020617]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-3">
          <div className="h-9 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-800" />
          <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
        </div>
        <div className="mb-6 h-13 w-full animate-pulse rounded-2xl bg-gray-200 py-6 dark:bg-zinc-800" />
        <ListViewSkeleton rows={6} />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                            Page export                             */
/* ------------------------------------------------------------------ */

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
