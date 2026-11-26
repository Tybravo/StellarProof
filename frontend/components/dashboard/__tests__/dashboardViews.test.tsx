import React from "react";
import { render, screen, within } from "@testing-library/react";
import VerifiedAssetsTable from "../VerifiedAssetsTable";
import AssetsGrid from "../AssetsGrid";
import MetricsOverview from "../MetricsOverview";
import type { DashboardAsset } from "@/services/dashboardMetricsService";

const assets: DashboardAsset[] = [
  {
    id: "a1",
    name: "Sunset",
    createdAt: "2026-01-15T00:00:00.000Z",
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef12",
    status: "verified",
    privacy: "public",
    mediaType: "image",
    thumbnailUrl: "https://example.com/a1.jpg",
  },
  {
    id: "a2",
    name: "Teaser",
    createdAt: "2026-02-20T00:00:00.000Z",
    contentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    status: "pending",
    privacy: "private",
    mediaType: "video",
  },
];

describe("MetricsOverview", () => {
  it("renders metric cards and activity from props", () => {
    render(
      <MetricsOverview
        totalAssets={1234}
        totalVerifications={56}
        recentActivity={[
          { id: "x", description: "Verified Sunset", timestamp: "2026-01-15T00:00:00.000Z", status: "verified" },
        ]}
      />,
    );
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("Verified Sunset")).toBeInTheDocument();
  });

  it("shows an empty message with no activity", () => {
    render(<MetricsOverview totalAssets={0} totalVerifications={0} recentActivity={[]} />);
    expect(screen.getByText("No recent activity.")).toBeInTheDocument();
  });
});

describe("VerifiedAssetsTable", () => {
  it("renders Date, Hash, Status and Privacy columns with data", () => {
    render(<VerifiedAssetsTable assets={assets} />);
    for (const col of ["Date", "Hash", "Status", "Privacy"]) {
      expect(screen.getByRole("columnheader", { name: col })).toBeInTheDocument();
    }
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("0xabcdef…ef12")).toBeInTheDocument();
    expect(within(rows[1]).getByText("verified")).toBeInTheDocument();
    expect(within(rows[2]).getByText("private")).toBeInTheDocument();
  });

  it("renders empty, loading and error states", () => {
    const { rerender } = render(<VerifiedAssetsTable assets={[]} />);
    expect(screen.getByText("No verified assets yet.")).toBeInTheDocument();
    rerender(<VerifiedAssetsTable assets={[]} isLoading />);
    expect(screen.getByTestId("assets-table-loading")).toBeInTheDocument();
    rerender(<VerifiedAssetsTable assets={[]} error="boom" />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});

describe("AssetsGrid", () => {
  it("renders thumbnails, placeholder and video badge", () => {
    render(<AssetsGrid assets={assets} />);
    expect(screen.getByRole("img", { name: "Sunset" })).toHaveAttribute("src", "https://example.com/a1.jpg");
    expect(screen.getByTestId("thumbnail-placeholder")).toBeInTheDocument();
    expect(screen.getByText("Video")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders empty, loading and error states", () => {
    const { rerender } = render(<AssetsGrid assets={[]} />);
    expect(screen.getByText("No verified assets yet.")).toBeInTheDocument();
    rerender(<AssetsGrid assets={[]} isLoading />);
    expect(screen.getByTestId("assets-grid-loading")).toBeInTheDocument();
    rerender(<AssetsGrid assets={[]} error="boom" />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });
});
