"use client";

import React, { useCallback, useState } from "react";
import Button from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";

export type Request = {
  id: string;
  hash: string;
  fullHash: string;
  manifest: string;
  attestation: string;
  timestamp: string;
  txHash: string;
  certificateUrl?: string;
  status: "verified" | "pending" | "failed";
  registryStatus?: string;
};

export type Props = {
  request: Request;
};

const statusClasses = {
  verified: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
} as const;

const registryClasses = {
  verified: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  unknown: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
} as const;

function shortHash(hash: string) {
  if (!hash) return "-";
  const left = hash.slice(0, 6);
  const right = hash.slice(-4);
  return `${left}...${right}`;
}

function formatShortTime(iso: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatFullTime(iso: string) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "long",
    });
  } catch {
    return iso;
  }
}

function stellarExplorerTxLink(txHash: string) {
  if (!txHash) return "#";
  return `https://stellar.expert/explorer/public/tx/${txHash}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <Button
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        void handleCopy();
      }}
      aria-label={`Copy ${value ? value.slice(0, 24) : "value"}`}
      className="ml-2 px-2 py-1"
      
      
    >
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

function CopyField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const safeValue = value ?? "-";
  return (
    <div className="flex flex-col gap-2 p-3 rounded border border-slate-200 dark:border-slate-700 sm:flex-row sm:items-start sm:gap-3">
      <div className="w-full text-sm text-slate-500 dark:text-slate-400 sm:w-36">
        {label}
      </div>
      <div className="flex-1 break-words text-sm text-slate-900 dark:text-slate-100">
        {safeValue}
      </div>
      <div className="flex items-center justify-end">
        <CopyButton value={safeValue} />
      </div>
    </div>
  );
}

function getRegistryStatusLabel(status?: string) {
  if (!status) return "unknown";
  return status.toLowerCase();
}

function getRegistryClass(status?: string) {
  const normalized = getRegistryStatusLabel(status);
  if (normalized === "verified") return registryClasses.verified;
  if (normalized === "pending") return registryClasses.pending;
  if (normalized === "failed") return registryClasses.failed;
  return registryClasses.unknown;
}

export default function RequestRow({ request }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((s) => !s), []);

  const status = request?.status ?? "pending";
  const registryStatus = request?.registryStatus ?? "unknown";

  return (
    <Accordion
      open={open}
      onToggle={toggle}
      aria-label={`${open ? "Collapse" : "Expand"} request ${shortHash(request?.hash ?? "")}, status: ${status}`}
      header={
        <div
          className="flex items-center justify-between gap-4 rounded-lg p-4 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="font-mono text-sm text-slate-700 dark:text-slate-300 truncate">
              {shortHash(request?.hash ?? "")}
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${statusClasses[status]}`}
            >
              {status}
            </div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
            {formatShortTime(request?.timestamp ?? "")}
          </div>
        </div>
      }
    >
      <div className="mt-2 rounded-lg bg-slate-50 p-4 shadow-sm dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Details
          </div>
          <div
            className={`px-2 py-1 rounded text-xs font-medium ${getRegistryClass(registryStatus)}`}
          >
            registry: {registryStatus}
          </div>
        </div>

        <div className="space-y-2">
          <CopyField label="Full Hash" value={request?.fullHash} />
          <CopyField label="Manifest" value={request?.manifest} />
          <CopyField label="Attestation" value={request?.attestation} />
          <CopyField
            label="Timestamp"
            value={formatFullTime(request?.timestamp ?? "")}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            href={stellarExplorerTxLink(request?.txHash ?? "")}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Tx
          </Button>

          {request?.certificateUrl ? (
            <Button
              href={request.certificateUrl}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Certificate
            </Button>
          ) : null}
        </div>
      </div>
    </Accordion>
  );
}
