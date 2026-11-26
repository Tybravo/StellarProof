"use client";

import React from "react";
import type { DashboardAsset } from "@/services/dashboardMetricsService";
import { formatDate, STATUS_STYLES } from "./dashboardFormat";

export interface AssetsGridProps {
  assets: DashboardAsset[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

const GRID_CLASS = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

function Thumbnail({ asset }: { asset: DashboardAsset }) {
  if (!asset.thumbnailUrl) {
    return (
      <div
        data-testid="thumbnail-placeholder"
        className="flex h-full w-full items-center justify-center text-xs text-gray-400"
      >
        No preview
      </div>
    );
  }
  return (
    // Thumbnails come from arbitrary storage hosts, so next/image is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset.thumbnailUrl} alt={asset.name} loading="lazy" className="h-full w-full object-cover" />
  );
}

export default function AssetsGrid({ assets, isLoading, error, className }: AssetsGridProps) {
  if (isLoading) {
    return (
      <div data-testid="assets-grid-loading" className={`${GRID_CLASS} ${className ?? ""}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
      >
        {error}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-white/15 dark:text-gray-400">
        No verified assets yet.
      </div>
    );
  }

  return (
    <ul className={`${GRID_CLASS} ${className ?? ""}`} aria-label="Verified assets gallery">
      {assets.map((asset) => (
        <li
          key={asset.id}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-darkblue"
        >
          <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-white/5">
            <Thumbnail asset={asset} />
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[asset.status]}`}
            >
              {asset.status}
            </span>
            {asset.mediaType === "video" && (
              <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                Video
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white" title={asset.name}>
              {asset.name}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDate(asset.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
