"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import MetricsOverview from "@/components/dashboard/MetricsOverview";
import VerifiedAssetsTable from "@/components/dashboard/VerifiedAssetsTable";
import AssetsGrid from "@/components/dashboard/AssetsGrid";
import { useDashboardMetrics } from "@/hooks/api/useDashboardMetrics";

export default function DashboardOverviewPage() {
  const { data, isLoading, error, refetch } = useDashboardMetrics();
  const [view, setView] = useState<"table" | "grid">("table");
  const message = error ? error.message : null;

  return (
    <div className="min-h-screen bg-white dark:bg-darkblue">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">Overview</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Your assets, verifications and recent activity at a glance.
        </p>

        {isLoading ? (
          <div data-testid="metrics-loading" className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
            <div className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
            <div className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
          </div>
        ) : message ? (
          <div
            role="alert"
            className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-md border border-red-300 px-3 py-1 font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <MetricsOverview
            totalAssets={data.totalAssets}
            totalVerifications={data.totalVerifications}
            recentActivity={data.recentActivity}
          />
        ) : null}

        <div className="mb-4 mt-10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assets</h2>
          <div
            role="group"
            aria-label="Assets view"
            className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-white/10"
          >
            {(["table", "grid"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize ${view === v ? "bg-primary text-white" : "text-gray-600 dark:text-gray-300"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Error is already shown above; the asset views just render empty. */}
        {view === "table" ? (
          <VerifiedAssetsTable assets={data?.assets ?? []} isLoading={isLoading} />
        ) : (
          <AssetsGrid assets={data?.assets ?? []} isLoading={isLoading} />
        )}
      </main>
    </div>
  );
}
