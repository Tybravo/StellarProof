"use client";

import React, { useEffect, useState } from "react";
import {
  Search,
  X,
  Globe,
  ShieldCheck,
  AlertCircle,
  List,
  LayoutGrid,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/Header";
import {
  fetchAllCertificates,
  searchCertificates,
} from "./services/searchService";
import { ListView } from "./components/ListView";
import { GridView } from "./components/GridView";
import type { SearchResult } from "./types";
import { cn } from "../../utils/cn";

type ViewMode = "list" | "grid";

const VIEW_STORAGE_KEY = "searchViewPreference";

function readViewPreference(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "list" || stored === "grid") return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode).
  }
  return "list";
}

/**
 * Debounce delay between keystrokes and the actual search call (ms).
 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Global Certificate Search page.
 *
 * Displays a list or grid of verified or pending certificates indexed
 * across the StellarProof network. Includes a search input, status
 * summary, view toggle (list/grid) with localStorage persistence,
 * and zero / loading states.
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  /**
   * Snapshot of the full backend response, restored when the user clears
   * the search input. Avoids a redundant network round-trip once cached.
   */
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  // Start in loading state so the first paint shows the skeleton.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** View mode (list vs grid), initialised from localStorage. */
  const [viewMode, setViewMode] = useState<ViewMode>(readViewPreference);

  /* ---------------------------------------------------------------- */
  /*              Initial dataset load on mount                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    fetchAllCertificates()
      .then((data) => {
        if (cancelled) return;
        setAllResults(data);
        setResults(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Failed to load global certificate index. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*          Persist view preference to localStorage                */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
    } catch {
      // localStorage unavailable.
    }
  }, [viewMode]);

  /* ---------------------------------------------------------------- */
  /*              Debounced search on query change                   */
  /* ---------------------------------------------------------------- */
  // The empty-query case is intentionally NOT handled here — it is
  // managed by `handleQueryChange` (an event handler) so that we do not
  // dispatch synchronous setState calls inside an effect body.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCertificates(trimmed)
        .then((data) => {
          if (!cancelled) setResults(data);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Search failed. Please try again.");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setError(null);
    setQuery(next);

    const trimmed = next.trim();

    // Clearing the search: restore cached full dataset without a spinner.
    if (trimmed === "") {
      if (allResults.length > 0) {
        setResults(allResults);
      }
      // Always clear loading on the empty path so the skeleton does not
      // remain stale after a type→clear sequence.
      setLoading(false);
      return;
    }

    setLoading(true);
  }

  const verifiedCount = results.filter((r) => r.status === "verified").length;
  const totalCount = results.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12"
      >
        {/* ─── Page header ───────────────────────────────────────────── */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Globe className="w-5 h-5 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                Global Certificate Search
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                Public index of verifiable certificates issued on the
                StellarProof network. Every record is anchored on-chain and
                tamper-evident.
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              {loading ? "…" : `${verifiedCount} verified`}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
              {loading
                ? "Loading…"
                : `${totalCount} total result${totalCount === 1 ? "" : "s"}`}
            </span>

            {/* ── View toggle button group ──────────────────────────── */}
            <div
              className="ml-auto inline-flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-0.5"
              role="radiogroup"
              aria-label="View mode"
            >
              <button
                role="radio"
                aria-checked={viewMode === "list"}
                aria-label="List view"
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200",
                  viewMode === "list"
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                )}
              >
                <List className="w-3.5 h-3.5" aria-hidden />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                role="radio"
                aria-checked={viewMode === "grid"}
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200",
                  viewMode === "grid"
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Search input ──────────────────────────────────────────── */}
        <div className="relative mb-6 sm:mb-8 max-w-2xl">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Search certificates globally"
            placeholder="Search by certificate id, asset name, creator or hash…"
            value={query}
            onChange={handleQueryChange}
            className={cn(
              "w-full rounded-xl border border-gray-300 dark:border-white/10",
              "bg-white dark:bg-white/5 py-2.5 sm:py-3 pl-10 pr-10",
              "text-sm sm:text-base text-gray-900 dark:text-white",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30",
              "transition",
            )}
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary-light hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Error state ───────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <AlertCircle
              className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* ─── Results view (list or grid) ──────────────────────────── */}
        {viewMode === "list" ? (
          <ListView
            results={results}
            isLoading={loading}
            emptyMessage={
              query.trim()
                ? `No certificates match "${query.trim()}"`
                : "No certificates have been indexed yet."
            }
          />
        ) : (
          <GridView
            results={results}
            isLoading={loading}
            emptyMessage={
              query.trim()
                ? `No certificates match "${query.trim()}"`
                : "No certificates have been indexed yet."
            }
          />
        )}
      </main>
    </div>
  );
}
