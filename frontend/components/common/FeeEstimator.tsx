"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, Zap } from "lucide-react";
import { Skeleton } from "../ui/Skeleton";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

interface FeeData {
  /** Base fee in stroops (1 XLM = 10,000,000 stroops) */
  baseFeeStroops: number;
  /** XLM/USD exchange rate */
  xlmUsdRate: number;
}

interface FeeEstimatorProps {
  /** Optional CSS class name */
  className?: string;
  /** Auto-refresh interval in ms. Pass 0 to disable. Default: 30_000 */
  refreshInterval?: number;
}

/* ------------------------------------------------------------------ */
/*                           Mock RPC fetch                            */
/* ------------------------------------------------------------------ */

/** Simulates a Stellar RPC fee fetch with a small random variance. */
async function fetchFeeData(): Promise<FeeData> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Stellar base fee: 100 stroops minimum, network may vary
  const baseFeeStroops = 100 + Math.floor(Math.random() * 50);
  // XLM/USD mock rate ~$0.10–$0.12
  const xlmUsdRate = 0.10 + Math.random() * 0.02;

  return { baseFeeStroops, xlmUsdRate };
}

/* ------------------------------------------------------------------ */
/*                           Helpers                                   */
/* ------------------------------------------------------------------ */

const STROOPS_PER_XLM = 10_000_000;

function stroopsToXlm(stroops: number): number {
  return stroops / STROOPS_PER_XLM;
}

function formatXlm(xlm: number): string {
  return xlm.toFixed(7).replace(/0+$/, "").replace(/\.$/, "");
}

function formatUsd(usd: number): string {
  if (usd < 0.000001) return "< $0.000001";
  return `$${usd.toFixed(6)}`;
}

/* ------------------------------------------------------------------ */
/*                         Main Component                              */
/* ------------------------------------------------------------------ */

export default function FeeEstimator({
  className,
  refreshInterval = 30_000,
}: FeeEstimatorProps) {
  const [feeData, setFeeData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeeData();
      setFeeData(data);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to fetch fee estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!refreshInterval) return;
    const id = setInterval(load, refreshInterval);
    return () => clearInterval(id);
  }, [load, refreshInterval]);

  const feeXlm = feeData ? stroopsToXlm(feeData.baseFeeStroops) : null;
  const feeUsd =
    feeData && feeXlm != null ? feeXlm * feeData.xlmUsdRate : null;

  return (
    <div
      className={[
        "rounded-2xl border border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-900/60 p-4 space-y-3",
        className ?? "",
      ]
        .join(" ")
        .trim()}
      role="region"
      aria-label="Fee Estimator"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Network Fee Estimate
          </h3>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label="Refresh fee estimate"
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500
            hover:text-primary dark:hover:text-primary
            hover:bg-gray-100 dark:hover:bg-gray-800
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          <RefreshCw
            className={["w-3.5 h-3.5", loading ? "animate-spin" : ""].join(
              " "
            ).trim()}
          />
        </button>
      </div>

      {/* Body */}
      {error ? (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle
            className="w-4 h-4 mt-0.5 text-red-500 dark:text-red-400 shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : loading && !feeData ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading fee">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
      ) : feeData && feeXlm != null && feeUsd != null ? (
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">
            {formatXlm(feeXlm)}{" "}
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              XLM
            </span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            {formatUsd(feeUsd)} USD
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            Base fee · {feeData.baseFeeStroops} stroops
          </p>
        </div>
      ) : null}

      {/* Footer timestamp */}
      {lastUpdated && !error && (
        <p className="text-[10px] text-gray-400 dark:text-gray-600 pt-1 border-t border-gray-100 dark:border-gray-800">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
