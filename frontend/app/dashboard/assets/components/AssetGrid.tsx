"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";

type AssetType = "image" | "video";
type AssetStatus = "verified" | "pending" | "revoked";

export interface Asset {
  id: string;
  title: string;
  type: AssetType;
  thumbnailUrl: string;
  status: AssetStatus;
  createdAt: string;
}

const STATUS_BADGE: Record<AssetStatus, string> = {
  verified:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  revoked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ... (VideoIcon, AssetGridSkeleton, EmptyState, AssetCard components remain the same)

interface AssetGridProps {
  assets: Asset[];
  isLoading?: boolean;
}

type SortKey = "title" | "createdAt";

export default function AssetGrid({ assets, isLoading = false }: AssetGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "dsc">("dsc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [assets, sortKey, sortDirection]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAssets, currentPage]);

  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [key, direction] = value.split('-') as [SortKey, "asc" | "dsc"];
    setSortKey(key);
    setSortDirection(direction);
  };

  return (
    <section aria-label="Digital assets gallery">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Assets
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {assets.length} asset{assets.length !== 1 ? "s" : ""}
          </span>
          <select onChange={handleSortChange} defaultValue="createdAt-dsc" className="text-sm rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white">
            <option value="createdAt-dsc">Newest</option>
            <option value="createdAt-asc">Oldest</option>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-dsc">Title (Z-A)</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <AssetGridSkeleton />
      ) : assets.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
          {totalPages > 1 && (
             <div className="flex items-center justify-between p-4 mt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-800 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function AssetGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center dark:border-white/15">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-7 w-7 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        No verified assets yet
      </h3>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Once you verify images or videos, their thumbnails will appear here in
        your gallery.
      </p>
    </div>
  );
}

interface AssetCardProps {
  asset: Asset;
}

function AssetCard({ asset }: AssetCardProps) {
  return (
    <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-darkblue">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        <Image
          src={asset.thumbnailUrl}
          alt={asset.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <span
          className={`absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[asset.status]}`}
        >
          {asset.status}
        </span>

        {asset.type === "video" && (
          <>
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
              <VideoIcon className="h-3.5 w-3.5" />
              Video
            </span>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                <svg
                  className="ml-0.5 h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </>
        )}
      </div>

      <div className="p-4">
        <h3
          className="truncate text-sm font-semibold text-gray-900 dark:text-white"
          title={asset.title}
        >
          {asset.title}
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatDate(asset.createdAt)}
        </p>
      </div>
    </article>
  );
}
