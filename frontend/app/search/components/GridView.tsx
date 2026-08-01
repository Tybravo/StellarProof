
/**
 * GridView — card-oriented rendering of global certificate search results.
 * Purely presentational: it receives already-fetched data from the page.
 *
 * @see Issue #377 – Integrate Soroban/Backend Search API (data plumbing)
 * @see Issue #375 – Global Certificate Search Results UI (Grid View)
 */
"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, FileCheck2, User2 } from "lucide-react";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { SearchCertificate } from "../../../services/searchService";
import {
  CopyHash,
  NetworkBadge,
  StatusBadge,
  formatBytes,
  formatDate,
  truncateMiddle,
} from "./shared";

export interface GridViewProps {
  certificates: SearchCertificate[];
  isLoading?: boolean;
  skeletonCards?: number;
}

/* ------------------------------------------------------------------ */
/*                            Skeleton                                 */
/* ------------------------------------------------------------------ */

export function GridViewSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-hidden="true"
      data-testid="grid-view-skeleton"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-white/5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <Skeleton className="h-3 w-24" />

"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * Represents the structure of a certificate search result.
 */
export interface Certificate {
  id: string;
  title: string;
  thumbnailUrl: string;
  issuerName: string;
  issueDate: string; // ISO date string
}

interface GridViewProps {
  results: Certificate[];
  isLoading: boolean;
}

/**
 * Formats an ISO date string into a more readable format (e.g., "Jan 1, 2024").
 * @param isoDate - The ISO date string to format.
 * @returns The formatted date string.
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A skeleton loader component displayed while search results are being fetched.
 */
function GridViewSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-gray-200 dark:bg-white/10" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          </div>

        </div>
      ))}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*                              Card                                   */
/* ------------------------------------------------------------------ */

function GridCard({ cert }: { cert: SearchCertificate }) {
  return (
    <Link
      href={`/certificate/${encodeURIComponent(cert.certificateId || cert.id)}`}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-primary/40"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5 transition-transform group-hover:scale-110">
          <FileCheck2 className="h-5 w-5 text-primary" aria-hidden />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={cert.status} />
          <NetworkBadge network={cert.network} />
        </div>
      </div>

      {/* Title + creator */}
      <div className="mt-4 min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
          {cert.title}
        </h3>
        <p
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
          title={cert.creator}
        >
          <User2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="font-mono">{truncateMiddle(cert.creator, 6, 6)}</span>
        </p>
      </div>

      {/* Hash block */}
      <dl className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 dark:border-white/5">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Certificate
          </dt>
          <dd className="truncate font-mono text-[11px] text-gray-700 dark:text-gray-300">
            {cert.certificateId || "—"}
          </dd>
        </div>
        {cert.contentHash && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Content
            </dt>
            <dd className="min-w-0">
              <CopyHash value={cert.contentHash} label="content hash" />
            </dd>
          </div>
        )}
        {cert.manifestHash && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Manifest
            </dt>
            <dd className="min-w-0">
              <CopyHash value={cert.manifestHash} label="manifest hash" />
            </dd>
          </div>
        )}
      </dl>

      {/* Tags */}
      {cert.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cert.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/5 dark:text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-[11px] text-gray-400 dark:text-gray-500">
        <time dateTime={cert.mintedAt}>{formatDate(cert.mintedAt)}</time>
        <span className="flex items-center gap-2">
          {cert.sizeBytes !== undefined && <span>{formatBytes(cert.sizeBytes)}</span>}
          <ArrowUpRight
            className="h-3.5 w-3.5 transition-colors group-hover:text-primary"
            aria-hidden
          />
        </span>
      </div>

/**
 * A component to display when no search results are found.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center dark:border-white/15">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        No Certificates Found
      </h3>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Your search did not match any certificates. Try adjusting your search
        terms.
      </p>
    </div>
  );
}

/**
 * A card component to display a single certificate in the grid.
 */
function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <Link href={`/certificate/${certificate.id}`} passHref>
      <article className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-darkblue">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
          <Image
            src={certificate.thumbnailUrl}
            alt={certificate.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <h3
            className="truncate text-sm font-semibold text-gray-900 dark:text-white"
            title={certificate.title}
          >
            {certificate.title}
          </h3>
          <p
            className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400"
            title={certificate.issuerName}
          >
            Issued by: {certificate.issuerName}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatDate(certificate.issueDate)}
          </p>
        </div>
      </article>

    </Link>
  );
}


/* ------------------------------------------------------------------ */
/*                             GridView                                */
/* ------------------------------------------------------------------ */

export default function GridView({
  certificates,
  isLoading = false,
  skeletonCards = 6,
}: GridViewProps) {
  if (isLoading) return <GridViewSkeleton cards={skeletonCards} />;

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      data-testid="search-grid-view"
    >
      {certificates.map((cert) => (
        <GridCard key={cert.id} cert={cert} />
      ))}
    </div>
  );
}

/**
 * Renders the grid view for global certificate search results.
 * It handles loading and empty states.
 */
export default function GridView({ results, isLoading }: GridViewProps) {
  if (isLoading) {
    return <GridViewSkeleton />;
  }

  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-live="polite"
    >
      {results.map((cert) => (
        <CertificateCard key={cert.id} certificate={cert} />
      ))}
    </div>
  );
}

