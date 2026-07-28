/**
 * ListView — dense, row-oriented rendering of global certificate search results.
 * Purely presentational: it receives already-fetched data from the page.
 *
 * @see Issue #377 – Integrate Soroban/Backend Search API (data plumbing)
 * @see Issue #374 – Global Certificate Search Results UI (List View)
 */
"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, FileCheck2, Layers, User2 } from "lucide-react";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { SearchCertificate } from "../../../services/searchService";
import {
  CopyHash,
  NetworkBadge,
  StatusBadge,
  formatBytes,
  formatDate,
  formatRelative,
  truncateMiddle,
} from "./shared";

export interface ListViewProps {
  certificates: SearchCertificate[];
  isLoading?: boolean;
  skeletonRows?: number;
}

/* ------------------------------------------------------------------ */
/*                            Skeleton                                 */
/* ------------------------------------------------------------------ */

export function ListViewSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden="true" data-testid="list-view-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*                              Row                                    */
/* ------------------------------------------------------------------ */

function ListRow({ cert }: { cert: SearchCertificate }) {
  return (
    <li>
      <Link
        href={`/certificate/${encodeURIComponent(cert.certificateId || cert.id)}`}
        className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-primary/40 sm:flex-row sm:items-center sm:gap-4"
      >
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 transition-transform group-hover:scale-110">
          <FileCheck2 className="h-5 w-5 text-primary" aria-hidden />
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {cert.title}
            </h3>
            <StatusBadge status={cert.status} />
            <NetworkBadge network={cert.network} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1.5" title={cert.creator}>
              <User2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="font-mono">{truncateMiddle(cert.creator, 6, 6)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {cert.certificateId || "—"}
            </span>
            <time dateTime={cert.mintedAt} title={new Date(cert.mintedAt).toString()}>
              {formatDate(cert.mintedAt)}
              <span className="ml-1 text-gray-400 dark:text-gray-500">
                ({formatRelative(cert.mintedAt)})
              </span>
            </time>
            {cert.sizeBytes !== undefined && <span>{formatBytes(cert.sizeBytes)}</span>}
          </div>

          {/* Hashes */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {cert.contentHash && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="font-medium uppercase tracking-wide">Content</span>
                <CopyHash value={cert.contentHash} label="content hash" />
              </span>
            )}
            {cert.manifestHash && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                <span className="font-medium uppercase tracking-wide">Manifest</span>
                <CopyHash value={cert.manifestHash} label="manifest hash" />
              </span>
            )}
          </div>

          {/* Tags */}
          {cert.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cert.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <ChevronRight
          className="hidden h-5 w-5 shrink-0 text-gray-300 transition-colors group-hover:text-primary dark:text-gray-600 sm:block"
          aria-hidden
        />
      </Link>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*                             ListView                                */
/* ------------------------------------------------------------------ */

export default function ListView({
  certificates,
  isLoading = false,
  skeletonRows = 6,
}: ListViewProps) {
  if (isLoading) return <ListViewSkeleton rows={skeletonRows} />;

  return (
    <ul className="space-y-3" data-testid="search-list-view">
      {certificates.map((cert) => (
        <ListRow key={cert.id} cert={cert} />
      ))}
    </ul>
  );
}
