import React from "react";
import { render, screen } from "@testing-library/react";
import { ProviderList } from "./ProviderList";

const mockProviders = [
  {
    id: "oracle-1",
    address: "GCAABBCCDDEEFFGGHHIIJJKKLLMMNNOOPPQQRRSSTTUU0123456789ABCD",
    name: "StellarOracle Prime",
    network: "Mainnet" as const,
    addedAt: "2024-01-20T09:00:00Z",
  },
];

describe("ProviderList", () => {
  it("renders list of providers", () => {
    render(<ProviderList providers={mockProviders} />);
    expect(screen.getByText("StellarOracle Prime")).toBeInTheDocument();
    expect(screen.getByText(/GCAABB...6789ABCD/i)).toBeInTheDocument();
    expect(screen.getByText(/authorized/i)).toBeInTheDocument();
  });

  it("renders empty state when no providers", () => {
    render(<ProviderList providers={[]} />);
    expect(screen.getByText(/no providers found/i)).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(<ProviderList providers={[]} isLoading={true} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});
