import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  fetchDashboardMetrics,
  type DashboardMetrics,
} from "@/services/dashboardMetricsService";

export const DASHBOARD_METRICS_QUERY_KEY = ["dashboard", "metrics"] as const;

export interface UseDashboardMetricsOptions {
  /** Bearer token for the signed-in user, if available. */
  token?: string;
  /** Poll interval in ms; disabled when omitted. */
  refetchIntervalMs?: number;
  enabled?: boolean;
  /** Retry policy for failed requests (default 1 retry). */
  retry?: number | boolean;
}

export type UseDashboardMetricsResult = UseQueryResult<DashboardMetrics, Error>;

/** Fetches dashboard overview metrics with caching, loading and error states. */
export function useDashboardMetrics(
  options: UseDashboardMetricsOptions = {},
): UseDashboardMetricsResult {
  const { token, refetchIntervalMs, enabled = true, retry = 1 } = options;
  return useQuery<DashboardMetrics, Error>({
    queryKey: [...DASHBOARD_METRICS_QUERY_KEY, token ?? "anonymous"],
    queryFn: ({ signal }) => fetchDashboardMetrics({ signal, token }),
    enabled,
    retry,
    refetchInterval: refetchIntervalMs ?? false,
  });
}
