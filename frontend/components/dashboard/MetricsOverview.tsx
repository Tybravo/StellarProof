"use client";

import React from "react";
import type { DashboardActivity } from "@/services/dashboardMetricsService";
import { formatDate, STATUS_STYLES } from "./dashboardFormat";

export interface MetricsOverviewProps {
  totalAssets: number;
  totalVerifications: number;
  recentActivity: DashboardActivity[];
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value.toLocaleString("en-US")}</p>
    </div>
  );
}

/** Presentational metrics cards and recent-activity list driven entirely by props. */
export default function MetricsOverview({
  totalAssets,
  totalVerifications,
  recentActivity,
}: MetricsOverviewProps) {
  return (
    <section aria-label="Dashboard metrics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Total Assets" value={totalAssets} />
        <MetricCard label="Total Verifications" value={totalVerifications} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
      {recentActivity.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-white/10 dark:border-white/10">
          {recentActivity.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-900 dark:text-white">{item.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.timestamp)}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[item.status]}`}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
