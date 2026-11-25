"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { TableSkeleton } from "@/components/ui/Skeleton";
import type { AssetVerificationStatus, DigitalAsset } from "@/services/assetsMock";

type SortKey = "verifiedAt" | "status";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<AssetVerificationStatus, number> = {
  pending: 0,
  verified: 1,
  revoked: 2,
};

export interface AssetsTableProps {
  assets: DigitalAsset[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

function compare(a: DigitalAsset, b: DigitalAsset, key: SortKey): number {
  if (key === "status") return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  const left = a.verifiedAt ? Date.parse(a.verifiedAt) : 0;
  const right = b.verifiedAt ? Date.parse(b.verifiedAt) : 0;
  return left - right;
}

export default function AssetsTable({
  assets,
  isLoading = false,
  error = null,
  className,
}: AssetsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("verifiedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    const copy = [...assets];
    copy.sort((a, b) => {
      const delta = compare(a, b, sortKey);
      return sortDir === "asc" ? delta : -delta;
    });
    return copy;
  }, [assets, sortKey, sortDir]);

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 overflow-hidden",
        className
      )}
    >
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <p className="px-4 py-12 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-gray-500">No assets found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Digital assets">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">Asset</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                  <button type="button" onClick={() => toggle("status")} className="uppercase tracking-wider">
                    Status {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">
                  <button type="button" onClick={() => toggle("verifiedAt")} className="uppercase tracking-wider">
                    Verified At {sortKey === "verifiedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => (
                <tr key={asset.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">{asset.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{asset.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {asset.verifiedAt ? new Date(asset.verifiedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
