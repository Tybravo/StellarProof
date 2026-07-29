"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  User,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { SearchResult } from "../types";
import {
  truncateHash,
  truncateAddress,
  formatDate,
  STATUS_ICON_BIG,
  StatusBadge,
  CopyButton,
  EmptyState,
} from "./shared";

/* ------------------------------------------------------------------ */
/*                              Types                                 */
/* ------------------------------------------------------------------ */

export interface ListViewProps {
  /** The array of search results to render. */
  results: SearchResult[];
  /** When true, render skeleton row placeholders instead of data. */
  isLoading?: boolean;
  /** Message shown when `results` is empty (and not loading). */
  emptyMessage?: string;
  /** Optional callback invoked when the user requests more results. */
  onLoadMore?: () => void;
  /** Whether more results are available (shows "Load more" affordance). */
  hasMore?: boolean;
}

/* ------------------------------------------------------------------ */
/*                            Row component                           */
/* ------------------------------------------------------------------ */

interface SearchResultRowProps {
  result: SearchResult;
}

function SearchResultRow({ result }: SearchResultRowProps) {
  const {
    id,
    name,
    description,
    hash,
    creator,
    mintedAt,
    status,
    network = "Stellar",
    type,
  } = result;

  const displayTitle =
    name?.trim() || `Certificate #${truncateHash(id, 4, 4)}`;

  const certHref = `/certificate/${encodeURIComponent(id)}`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className={cn(
        // `relative` + the stretched-link `::after` inside <Link> lets the
        // entire row behave as a click-target without nesting <button> in <a>.
        "group relative rounded-2xl border bg-white dark:bg-white/5",
        "border-gray-200 dark:border-white/10",
        "hover:border-primary/50 dark:hover:border-primary/40",
        "hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10",
        "focus-within:border-primary/60",
        "transition-all duration-200",
      )}
    >
      <div className="relative flex items-start gap-4 p-4 sm:p-5">
        {/* Leading icon (decorative) */}
        <div
          className={cn(
            "hidden sm:flex shrink-0 h-11 w-11 items-center justify-center rounded-xl",
            "bg-gradient-to-br border",
            status === "verified" &&
              "from-green-500/15 to-green-500/5 border-green-500/20 text-green-600 dark:text-green-400",
            status === "pending" &&
              "from-yellow-500/15 to-yellow-500/5 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
            status === "failed" &&
              "from-red-500/15 to-red-500/5 border-red-500/20 text-red-600 dark:text-red-400",
          )}
          aria-hidden
        >
          {STATUS_ICON_BIG[status]}
        </div>

        {/* Content (fills available space) */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title row: wraps the actual <Link> so the clickable target is a single <a> */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate max-w-full">
              <Link
                href={certHref}
                aria-label={`View certificate ${displayTitle}`}
                className={cn(
                  // Stretched-link: a transparent ::after covers the whole
                  // card so any click navigates, while the title remains
                  // keyboard-focusable as a real <a>.
                  "relative outline-none",
                  "after:absolute after:inset-0 after:content-['']",
                  "hover:text-primary dark:hover:text-primary-light",
                  "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded-sm",
                  "transition-colors",
                )}
              >
                {displayTitle}
              </Link>
            </h3>
            <StatusBadge status={status} />
            {type && (
              <span className="hidden sm:inline-flex items-center rounded-md bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {type}
              </span>
            )}
          </div>

          {/* Description (optional, single-line truncation) */}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {description}
            </p>
          )}

          {/* Metadata grid */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-1">
            {/* Hash (with copy button outside the link) */}
            <div className="flex items-center gap-1.5 min-w-0 max-w-full">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0">
                Hash
              </span>
              <code
                className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate"
                title={hash || "Unavailable"}
              >
                {truncateHash(hash)}
              </code>
              <CopyButton value={hash || ""} label="hash" />
            </div>

            {/* Creator */}
            <div className="flex items-center gap-1.5 min-w-0">
              <User
                className="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500"
                aria-hidden
              />
              <span
                className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate"
                title={creator}
              >
                {truncateAddress(creator)}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Clock
                className="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500"
                aria-hidden
              />
              <time
                dateTime={mintedAt}
                className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap"
              >
                {formatDate(mintedAt)}
              </time>
            </div>

            {/* Network (hidden on mobile) */}
            <span className="hidden sm:inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-primary/80 dark:text-primary-light ml-auto">
              {network}
            </span>
          </div>
        </div>

        {/* Trailing action — visible affordance for desktop users. */}
        <span
          className={cn(
            "hidden sm:inline-flex shrink-0 items-center gap-1 self-center px-3 py-1.5 rounded-lg text-[11px] font-semibold",
            "text-gray-500 dark:text-gray-400",
            "bg-gray-50 dark:bg-white/5",
            "group-hover:text-primary group-hover:bg-primary/10 dark:group-hover:bg-primary/20",
            "transition-colors",
          )}
        >
          View
          <ChevronRight
            className="w-3 h-3 group-hover:translate-x-0.5 transition-transform"
            aria-hidden
          />
        </span>
      </div>

      {/* Mobile-only affordance label */}
      <div className="sm:hidden px-4 pb-3 -mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-primary">
        <span>Open certificate</span>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden />
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/*                       Loading skeleton                             */
/* ------------------------------------------------------------------ */

function ListViewSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul
      className="space-y-3"
      role="list"
      aria-busy="true"
      aria-label="Loading search results"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 sm:p-5"
        >
          <div className="flex items-start gap-4">
            <Skeleton className="hidden sm:block h-11 w-11 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*                             Component                              */
/* ------------------------------------------------------------------ */

/**
 * `ListView` — global certificate search results, list orientation.
 *
 * Renders one row per `SearchResult` with key metadata (hash, creator,
 * date, status). Each row uses a stretched-link pattern, so the title
 * is the actual `<a>` element while clicks anywhere on the card
 * navigate to `/certificate/[id]`. Designed for full keyboard /
 * screen-reader accessibility and responsive layout across mobile,
 * tablet and desktop breakpoints.
 */
export function ListView({
  results,
  isLoading = false,
  emptyMessage = "No certificates match your search.",
  onLoadMore,
  hasMore = false,
}: ListViewProps) {
  if (isLoading) {
    return <ListViewSkeleton />;
  }

  if (results.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <section aria-label="Search results" className="space-y-3">
      <ul role="list" className="space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {results.map((result, index) => (
            <motion.li
              key={result.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: Math.min(index * 0.04, 0.4) },
              }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SearchResultRow result={result} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
              "border border-gray-300 dark:border-white/10",
              "bg-white dark:bg-white/5",
              "text-gray-700 dark:text-gray-300",
              "hover:border-primary dark:hover:border-primary",
              "hover:text-primary dark:hover:text-primary-light",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
          >
            Load more results
          </button>
        </div>
      )}
    </section>
  );
}

export default ListView;
