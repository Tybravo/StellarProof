import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { NodeMetricsChart } from "../NodeMetricsChart";
import { getNodeMetrics } from "@/services/nodeMetricsService";

jest.mock("@/services/nodeMetricsService", () => ({
  getNodeMetrics: jest.fn(),
}));

const mockedGetNodeMetrics = getNodeMetrics as jest.Mock;

describe("NodeMetricsChart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the chart once metrics load", async () => {
    mockedGetNodeMetrics.mockResolvedValue([
      { timestamp: "2024-01-01T00:00:00Z", uptimePct: 99.2, latencyMs: 120 },
      { timestamp: "2024-01-01T01:00:00Z", uptimePct: 98.7, latencyMs: 135 },
    ]);

    render(<NodeMetricsChart nodeId="oracle-1" label="Test Oracle" />);

    await waitFor(() => {
      expect(screen.getByText("Test Oracle")).toBeInTheDocument();
    });

    expect(mockedGetNodeMetrics).toHaveBeenCalledWith("oracle-1", 12);
    expect(screen.getByRole("img", { name: /uptime and latency chart for test oracle/i })).toBeInTheDocument();
  });

  it("renders an error state when metrics fail to load", async () => {
    mockedGetNodeMetrics.mockRejectedValue(new Error("network down"));

    render(<NodeMetricsChart nodeId="oracle-2" label="Broken Oracle" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load node metrics.")).toBeInTheDocument();
    });
  });
});
