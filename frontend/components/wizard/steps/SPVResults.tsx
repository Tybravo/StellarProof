/**
 * Encrypted Hash Display Panel (SPV Results)
 * Shows the encrypted hash and storage ID with copy-to-clipboard functionality.
 *
 * @see Issue #69 – Frontend: Encrypted Hash Display Panel
 */
"use client";

import React, { useCallback, useState } from "react";
import { Copy, Check, ShieldCheck, Info, Eye, EyeOff } from "lucide-react";
import { useWizard } from "@/context/WizardContext";

/** Mask a hash string showing only first and last 8 characters. */
function maskHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}${"•".repeat(8)}${hash.slice(-8)}`;
}

interface ResultFieldProps {
  label: string;
  tooltip: string;
  value: string;
  maskable?: boolean;
}

function ResultField({ label, tooltip, value, maskable = false }: ResultFieldProps) {
  const [copied, setCopied] = useState(false);
  const [masked, setMasked] = useState(maskable);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label="Info"
            className="text-gray-400 hover:text-primary transition"
          >
            <Info className="w-3 h-3" />
          </button>
          {showTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-800 text-xs text-white shadow-lg z-10">
              {tooltip}
            </div>
          )}
        </div>
      </div>

      {/* Value + actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1 px-3 py-2.5 rounded-xl font-mono text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 break-all select-all">
          {masked ? maskHash(value) : value}
        </div>

        {maskable && (
          <button
            type="button"
            onClick={() => setMasked(!masked)}
            aria-label={masked ? "Show full value" : "Mask value"}
            className="shrink-0 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {masked ? (
              <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy to clipboard"
          className="shrink-0 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function SPVResults() {
  const { state } = useWizard();

  // Mock data fallback for development when no real SPV result is available
  const encryptedHash =
    state.spvResult?.encryptedHash ??
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const storageId =
    state.spvResult?.storageId ?? "spv-store-a1b2c3d4e5f6";

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* Encrypted locally badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 w-fit">
        <ShieldCheck className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        <span className="text-xs font-medium text-green-700 dark:text-green-300">
          Encrypted Locally
        </span>
      </div>

      {/* Results card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-5">
        <ResultField
          label="Encrypted Hash"
          tooltip="This is your content hash after client-side encryption. It can be stored on-chain without revealing the original data."
          value={encryptedHash}
          maskable
        />

        <ResultField
          label="Storage ID"
          tooltip="A unique identifier for locating your encrypted provenance record in the storage layer."
          value={storageId}
        />
      </div>
    </div>
  );
}
