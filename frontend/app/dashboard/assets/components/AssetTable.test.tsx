import React from "react";
import { render, screen } from "@testing-library/react";
import AssetTable from "./AssetTable";
import { MOCK_ASSETS } from "@/services/assetsMock";

describe("AssetTable", () => {
  it("renders a header for every column", () => {
    render(<AssetTable assets={MOCK_ASSETS} />);

    [
      "Asset",
      "Type",
      "Owner",
      "Content Hash",
      "KMS Encryption",
      "Verified At",
      "Status",
      "Size",
    ].forEach((heading) => {
      expect(
        screen.getByRole("columnheader", { name: heading })
      ).toBeInTheDocument();
    });
  });

  it("renders a row for every asset with its KMS status and verification info", () => {
    render(<AssetTable assets={MOCK_ASSETS} />);

    expect(screen.getAllByRole("row")).toHaveLength(MOCK_ASSETS.length + 1);
    expect(screen.getByText("Limited Edition Digital Artwork")).toBeInTheDocument();
    expect(screen.getAllByText(/encrypted/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/unencrypted/i)).toBeInTheDocument();
  });

  it("renders a loading skeleton", () => {
    const { container } = render(<AssetTable assets={[]} isLoading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders an empty state when there are no assets", () => {
    render(<AssetTable assets={[]} />);
    expect(screen.getByText(/no assets found/i)).toBeInTheDocument();
  });
});
