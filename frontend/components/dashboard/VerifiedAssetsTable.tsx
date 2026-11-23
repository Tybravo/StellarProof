"use client";

import React from "react";
import { TableSkeleton } from "@/components/ui/Skeleton";
import type { DashboardAsset } from "@/services/dashboardMetricsService";
import { formatDate, shortenHash, STATUS_STYLES } from "./dashboardFormat";

export interface VerifiedAssetsTableProps {
  assets: DashboardAsset[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

const COLUMNS = ["Date", "Hash", "Status", "Privacy"];

export default function VerifiedAssetsTable({ assets, isLoading, error, className }: VerifiedAssetsTableProps) {
  if (isLoading) {
    return (
      <div data-testid="assets-table-loading" className={className}>
        <TableSkeleton />
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

  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 ${className ?? ""}`}>
      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-white/10" aria-label="Verified assets">
        <thead className="bg-gray-50 dark:bg-white/5">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-white/10">
          {assets.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                No verified assets yet.
              </td>
            </tr>
          ) : (
            assets.map((asset) => (
              <tr key={asset.id}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">
                  {formatDate(asset.createdAt)}
                </td>
                <td
                  className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300"
                  title={asset.contentHash}
                >
                  {shortenHash(asset.contentHash)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[asset.status]}`}
                  >
                    {asset.status}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-gray-700 dark:text-gray-300">{asset.privacy}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
