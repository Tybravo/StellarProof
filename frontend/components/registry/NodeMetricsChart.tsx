"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getNodeMetrics, type NodeMetricPoint } from "@/services/nodeMetricsService";

interface NodeMetricsChartProps {
  /** Oracle node identifier (provider address or id) to chart metrics for. */
  nodeId: string;
  /** Human-readable label shown above the chart. */
  label?: string;
  /** Number of historical samples to request. Defaults to 12. */
  points?: number;
}

function formatHour(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Visualizes an Oracle node's historical uptime and response latency using
 * Recharts, so operators and reviewers can see node health over time.
 */
export function NodeMetricsChart({ nodeId, label, points = 12 }: NodeMetricsChartProps) {
  const [data, setData] = useState<NodeMetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getNodeMetrics(nodeId, points)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load node metrics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [nodeId, points]);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {error}
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    time: formatHour(point.timestamp),
  }));

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {label ?? "Uptime & Latency"}
        </h3>
      </div>
      <div className="h-56 w-full" role="img" aria-label={`Uptime and latency chart for ${label ?? nodeId}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="uptime" domain={[0, 100]} tick={{ fontSize: 11 }} width={34} />
            <YAxis yAxisId="latency" orientation="right" tick={{ fontSize: 11 }} width={34} />
            <Tooltip
              formatter={(value, name) => {
                const numericValue = typeof value === "number" ? value : Number(value);
                return name === "uptimePct"
                  ? [`${numericValue.toFixed(1)}%`, "Uptime"]
                  : [`${numericValue} ms`, "Latency"];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              yAxisId="uptime"
              type="monotone"
              dataKey="uptimePct"
              name="Uptime %"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="latency"
              type="monotone"
              dataKey="latencyMs"
              name="Latency (ms)"
              stroke="#256af4"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
