/**
 * Registry Transparency Page
 * Public dashboard displaying trusted TEE hashes and authorized oracle providers.
 * Supports search, pagination, copy-to-clipboard, refresh, and skeleton loaders.
 *
 * @see Issue #87 – Registry Transparency Page
 */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Cpu,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/Header";
import { Skeleton } from "../../components/ui/Skeleton";
import {
  registryService,
  type TeeHash,
  type OracleProvider,
  type RegistryData,
} from "../../services/registry";

/* ------------------------------------------------------------------ */
/*                         Constants                                   */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 5;

/* ------------------------------------------------------------------ */
/*                      Copy Button                                    */
/* ------------------------------------------------------------------ */

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label ?? value}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors shrink-0"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-green-500 dark:text-green-400"
          >
            <Check className="w-3.5 h-3.5" />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                      Pagination Controls                            */
/* ------------------------------------------------------------------ */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-white/10">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-label={`Go to page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
              p === page
                ? "bg-primary text-white shadow-button-glow"
                : "text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                     List Skeleton Loader                            */
/* ------------------------------------------------------------------ */

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
        >
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="w-14 h-7 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                     TEE Hash Row                                    */
/* ------------------------------------------------------------------ */

function TeeHashRow({ item }: { item: TeeHash }) {
  const addedDate = new Date(item.addedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/40 dark:hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
        <Cpu className="h-4.5 w-4.5 text-primary" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {item.label}
          </span>
          <span className="inline-flex items-center rounded-full bg-primary/10 dark:bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
            v{item.version}
          </span>
        </div>
        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate" title={item.hash}>
          {item.hash}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden />
          Added {addedDate}
        </p>
      </div>
      <CopyButton value={item.hash} label={`hash for ${item.label}`} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*                   Oracle Provider Row                               */
/* ------------------------------------------------------------------ */

function OracleProviderRow({ item }: { item: OracleProvider }) {
  const addedDate = new Date(item.addedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const networkClass =
    item.network === "Mainnet"
      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/40 dark:hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 dark:bg-secondary/15">
        <Shield className="h-4.5 w-4.5 text-secondary" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {item.name}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${networkClass}`}
          >
            {item.network}
          </span>
        </div>
        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate" title={item.address}>
          {item.address}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" aria-hidden />
          Added {addedDate}
        </p>
      </div>
      <CopyButton value={item.address} label={`address for ${item.name}`} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*                      Empty State                                    */
/* ------------------------------------------------------------------ */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
        <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Main Page                                   */
/* ------------------------------------------------------------------ */

export default function RegistryPage() {
  const [data, setData] = useState<RegistryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [teePage, setTeePage] = useState(1);
  const [oraclePage, setOraclePage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await registryService.getRegistry();
      setData(result);
    } catch {
      setError("Failed to load registry data. Please try again.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Reset pagination to page 1 on search change
  useEffect(() => {
    setTeePage(1);
    setOraclePage(1);
  }, [search]);

  const normalizedSearch = search.toLowerCase().trim();

  const filteredTeeHashes = useMemo(
    () =>
      (data?.teeHashes ?? []).filter(
        (item) =>
          !normalizedSearch ||
          item.hash.toLowerCase().includes(normalizedSearch) ||
          item.label.toLowerCase().includes(normalizedSearch) ||
          item.version.toLowerCase().includes(normalizedSearch),
      ),
    [data, normalizedSearch],
  );

  const filteredOracleProviders = useMemo(
    () =>
      (data?.oracleProviders ?? []).filter(
        (item) =>
          !normalizedSearch ||
          item.address.toLowerCase().includes(normalizedSearch) ||
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.network.toLowerCase().includes(normalizedSearch),
      ),
    [data, normalizedSearch],
  );

  const teeTotalPages = Math.max(1, Math.ceil(filteredTeeHashes.length / PAGE_SIZE));
  const oracleTotalPages = Math.max(1, Math.ceil(filteredOracleProviders.length / PAGE_SIZE));

  const pagedTeeHashes = filteredTeeHashes.slice(
    (teePage - 1) * PAGE_SIZE,
    teePage * PAGE_SIZE,
  );
  const pagedOracleProviders = filteredOracleProviders.slice(
    (oraclePage - 1) * PAGE_SIZE,
    oraclePage * PAGE_SIZE,
  );

  const lastUpdatedLabel = data
    ? new Date(data.lastUpdated).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans selection:bg-primary/30">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                Registry
              </h1>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
                Public transparency dashboard for trusted TEE hashes and
                authorized oracle providers.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {lastUpdatedLabel && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                  <Clock className="w-3.5 h-3.5" aria-hidden />
                  Updated {lastUpdatedLabel}
                </span>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                aria-label="Refresh registry data"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Refresh
              </button>
            </div>
          </div>
          {/* Mobile last-updated */}
          {lastUpdatedLabel && (
            <p className="flex sm:hidden items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              Updated {lastUpdatedLabel}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-xl">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Search registry"
            placeholder="Search hashes, providers, addresses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── TEE Hashes ── */}
          <section aria-labelledby="tee-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                  <Cpu className="h-4 w-4 text-primary" aria-hidden />
                </div>
                <h2
                  id="tee-heading"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Trusted TEE Hashes
                </h2>
              </div>
              {!loading && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredTeeHashes.length} entr
                  {filteredTeeHashes.length === 1 ? "y" : "ies"}
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-4 space-y-4">
              {loading ? (
                <ListSkeleton rows={PAGE_SIZE} />
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {pagedTeeHashes.length > 0 ? (
                      pagedTeeHashes.map((item) => (
                        <TeeHashRow key={item.id} item={item} />
                      ))
                    ) : (
                      <EmptyState
                        message={
                          search
                            ? `No TEE hashes matching "${search}"`
                            : "No TEE hashes found"
                        }
                      />
                    )}
                  </AnimatePresence>
                  <Pagination
                    page={teePage}
                    totalPages={teeTotalPages}
                    onPage={setTeePage}
                  />
                </>
              )}
            </div>
          </section>

          {/* ── Oracle Providers ── */}
          <section aria-labelledby="oracle-heading">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 dark:bg-secondary/15">
                  <Shield className="h-4 w-4 text-secondary" aria-hidden />
                </div>
                <h2
                  id="oracle-heading"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Authorized Oracle Providers
                </h2>
              </div>
              {!loading && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {filteredOracleProviders.length} entr
                  {filteredOracleProviders.length === 1 ? "y" : "ies"}
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-4 space-y-4">
              {loading ? (
                <ListSkeleton rows={PAGE_SIZE} />
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    {pagedOracleProviders.length > 0 ? (
                      pagedOracleProviders.map((item) => (
                        <OracleProviderRow key={item.id} item={item} />
                      ))
                    ) : (
                      <EmptyState
                        message={
                          search
                            ? `No oracle providers matching "${search}"`
                            : "No oracle providers found"
                        }
                      />
                    )}
                  </AnimatePresence>
                  <Pagination
                    page={oraclePage}
                    totalPages={oracleTotalPages}
                    onPage={setOraclePage}
                  />
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
