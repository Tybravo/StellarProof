import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardOverviewPage from "./page";
import { useDashboardMetrics } from "@/hooks/api/useDashboardMetrics";

jest.mock("@/components/Header", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("@/hooks/api/useDashboardMetrics", () => ({ useDashboardMetrics: jest.fn() }));

const mockHook = useDashboardMetrics as jest.Mock;

describe("DashboardOverviewPage", () => {
  it("shows loading state", () => {
    mockHook.mockReturnValue({ isLoading: true });
    render(<DashboardOverviewPage />);
    expect(screen.getByTestId("metrics-loading")).toBeInTheDocument();
  });

  it("shows error with retry", () => {
    const refetch = jest.fn();
    mockHook.mockReturnValue({ isLoading: false, error: new Error("nope"), refetch });
    render(<DashboardOverviewPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("nope");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders metrics and toggles between table and grid", () => {
    mockHook.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        totalAssets: 3,
        totalVerifications: 9,
        recentActivity: [],
        assets: [
          { id: "a", name: "A", createdAt: "2026-01-01", contentHash: "0x1", status: "verified", privacy: "public", mediaType: "image" },
        ],
      },
    });
    render(<DashboardOverviewPage />);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "grid" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Verified assets gallery")).toBeInTheDocument();
  });
});
