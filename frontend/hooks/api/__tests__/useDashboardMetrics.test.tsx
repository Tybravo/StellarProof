import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardMetrics } from "../useDashboardMetrics";
import {
  DASHBOARD_METRICS_ENDPOINT,
  normalizeDashboardMetrics,
} from "@/services/dashboardMetricsService";

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

describe("useDashboardMetrics", () => {
  it("loads and normalises metrics", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        data: {
          totalAssets: 2,
          totalVerifications: 5,
          recentActivity: [{ id: "r1", description: "Verified", timestamp: "2026-01-01", status: "VERIFIED" }],
          assets: [{ id: "a", name: "A", hash: "0x1", status: "verified", isPrivate: true, type: "image" }],
        },
      }),
    );

    const { result } = renderHook(() => useDashboardMetrics({ retry: false }), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe(DASHBOARD_METRICS_ENDPOINT);
    expect(result.current.data?.totalVerifications).toBe(5);
    expect(result.current.data?.recentActivity[0].status).toBe("verified");
    expect(result.current.data?.assets[0]).toMatchObject({ contentHash: "0x1", privacy: "private" });
  });

  it("sends the bearer token when provided", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    const { result } = renderHook(() => useDashboardMetrics({ token: "tok", retry: false }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer tok");
  });

  it("surfaces API errors", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "Unauthorized" }, false, 401));
    const { result } = renderHook(() => useDashboardMetrics({ retry: false }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Unauthorized");
  });

  it("surfaces network errors", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useDashboardMetrics({ retry: false }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("network down");
  });

  it("does not fetch when disabled", () => {
    renderHook(() => useDashboardMetrics({ enabled: false }), { wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("normalizeDashboardMetrics", () => {
  it("defaults missing and malformed fields", () => {
    expect(normalizeDashboardMetrics(null)).toEqual({
      totalAssets: 0,
      totalVerifications: 0,
      recentActivity: [],
      assets: [],
    });
    const m = normalizeDashboardMetrics({ totalVerifications: -3, assets: [{ status: "weird" }, "x"] });
    expect(m.totalVerifications).toBe(0);
    expect(m.totalAssets).toBe(1);
    expect(m.assets[0]).toMatchObject({ status: "pending", privacy: "public", mediaType: "other" });
  });
});
