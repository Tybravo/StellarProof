"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { cn } from "@/utils/cn";
import { TableSkeleton } from "@/components/ui/Skeleton";
import type {
  AssetVerificationStatus,
  DigitalAsset,
  KmsEncryptionStatus,
} from "@/services/assetsMock";

export interface AssetTableProps {
  assets: DigitalAsset[];
  isLoading?: boolean;
  className?: string;
}

const COLUMNS = [
  "Asset",
  "Type",
  "Owner",
  "Content Hash",
  "KMS Encryption",
  "Verified At",
  "Status",
  "Size",
];

const STATUS_STYLES: Record<AssetVerificationStatus, string> = {
  verified:
    "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700",
  pending:
    "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700",
  revoked:
    "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700",
};

const KMS_META: Record<
  KmsEncryptionStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  encrypted: {
    label: "Encrypted",
    icon: ShieldCheck,
    className: "text-green-600 dark:text-green-400",
  },
  pending: {
    label: "Pending",
    icon: ShieldAlert,
    className: "text-yellow-600 dark:text-yellow-400",
  },
  unencrypted: {
    label: "Unencrypted",
    icon: ShieldOff,
    className: "text-red-600 dark:text-red-400",
  },
};

function shortenHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function EmptyState() {
  return (
    <div className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
      No assets found.
    </div>
  );
}

function AssetRow({ asset }: { asset: DigitalAsset }) {
  const kms = KMS_META[asset.kmsEncryptionStatus];
  const KmsIcon = kms.icon;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">
        {asset.name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {asset.type}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {asset.owner}
      </td>
      <td
        className="px-4 py-3 text-sm font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap"
        title={asset.contentHash}
      >
        {shortenHash(asset.contentHash)}
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <span
          className={cn("inline-flex items-center gap-1.5", kms.className)}
        >
          <KmsIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {kms.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {asset.verifiedAt
          ? new Date(asset.verifiedAt).toLocaleString()
          : "—"}
      </td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <span
          className={cn(
            "inline-block px-2 py-0.5 rounded-full text-xs font-medium border",
            STATUS_STYLES[asset.status]
          )}
        >
          {asset.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatBytes(asset.sizeBytes)}
      </td>
    </tr>
  );
}

export default function AssetTable({
  assets,
  isLoading = false,
  className,
}: AssetTableProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 overflow-hidden",
        className
      )}
    >
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : assets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left" aria-label="Digital assets">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                {COLUMNS.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
