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

export interface GridViewProps {
  /** The array of search results to render. */
  results: SearchResult[];
  /** When true, render skeleton card placeholders instead of data. */
  isLoading?: boolean;
  /** Message shown when `results` is empty (and not loading). */
  emptyMessage?: string;
  /** Optional callback invoked when the user requests more results. */
  onLoadMore?: () => void;
  /** Whether more results are available (shows "Load more" affordance). */
  hasMore?: boolean;
}


interface SearchResultCardProps {
  result: SearchResult;
}

function SearchResultCard({ result }: SearchResultCardProps) {
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
        "group relative flex flex-col rounded-2xl border bg-white dark:bg-white/5",
        "border-gray-200 dark:border-white/10",
        "hover:border-primary/50 dark:hover:border-primary/40",
        "hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10",
        "focus-within:border-primary/60",
        "transition-all duration-200",
        "h-full",
      )}
    >
      {/* Card header with status icon and badge */}
      <div className="p-4 sm:p-5 pb-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className={cn(
              "shrink-0 h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl",
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
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {type && (
              <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {type}
              </span>
            )}
            <StatusBadge status={status} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5">
          <Link
            href={certHref}
            aria-label={`View certificate ${displayTitle}`}
            className={cn(
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

        {/* Description */}
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
            {description}
          </p>
        )}
      </div>

      {/* Spacer to push metadata to bottom */}
      <div className="flex-1" />

      {/* Metadata section */}
      <div className="p-4 sm:p-5 pt-0 space-y-2">
        {/* Hash */}
        <div className="flex items-center gap-1.5 min-w-0">
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

        {/* Date + Network row */}
        <div className="flex items-center justify-between gap-2 pt-1">
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 dark:text-primary-light">
            {network}
          </span>
        </div>
      </div>

      {/* Footer with view action */}
      <div className="px-4 pb-3 sm:px-5 sm:pb-4 flex items-center justify-end gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold",
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
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/*                          Card component                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*                       Loading skeleton                             */
/* ------------------------------------------------------------------ */

function GridViewSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
      role="list"
      aria-busy="true"
      aria-label="Loading search results"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                             Component                              */
/* ------------------------------------------------------------------ */

/**
 * `GridView` — global certificate search results, card grid orientation.
 *
 * Renders one card per `SearchResult` with key metadata (hash, creator,
 * date, status). Each card uses a stretched-link pattern, so the title
 * is the actual `<a>` element while clicks anywhere on the card
 * navigate to `/certificate/[id]`. Responsive: 1 col on mobile,
 * 2 cols on tablet, 3 cols on desktop.
 */
export function GridView({
  results,
  isLoading = false,
  emptyMessage = "No certificates match your search.",
  onLoadMore,
  hasMore = false,
}: GridViewProps) {
  if (isLoading) {
    return <GridViewSkeleton />;
  }

  if (results.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <section aria-label="Search results" className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <AnimatePresence mode="popLayout" initial={false}>
          {results.map((result, index) => (
            <motion.div
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
              <SearchResultCard result={result} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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

export default GridView;
