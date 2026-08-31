/**
 * Tests for the pricing feature comparison table.
 */
import React from "react";
import { render, screen, within } from "@testing-library/react";
import PricingTable, {
  PRICING_FEATURE_GROUPS,
  PRICING_TIER_COLUMNS,
  type PricingFeatureGroup,
  type PricingTierColumn,
} from "../PricingTable";

describe("PricingTable", () => {
  it("renders a column header for every tier", () => {
    render(<PricingTable />);

    for (const tier of PRICING_TIER_COLUMNS) {
      expect(
        screen.getByRole("columnheader", { name: new RegExp(tier.name, "i") })
      ).toBeInTheDocument();
    }
  });

  it("renders every feature group and feature row", () => {
    render(<PricingTable />);

    for (const group of PRICING_FEATURE_GROUPS) {
      expect(screen.getByText(group.name)).toBeInTheDocument();
      for (const feature of group.features) {
        expect(
          screen.getByRole("rowheader", { name: new RegExp(feature.name, "i") })
        ).toBeInTheDocument();
      }
    }
  });

  it("maps each feature to the value configured for its tier", () => {
    const tiers: PricingTierColumn[] = [
      { id: "free", name: "Free", price: "$0/mo", cta: "Start", href: "/verify" },
      {
        id: "personal",
        name: "Personal",
        price: "$9/mo",
        popular: true,
        cta: "Start",
        href: "/verify",
      },
      {
        id: "business",
        name: "Business",
        price: "$29/mo",
        cta: "Start",
        href: "/verify",
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "$99/mo",
        cta: "Contact",
        href: "/contact",
      },
    ];
    const groups: PricingFeatureGroup[] = [
      {
        name: "Verification",
        features: [
          {
            name: "Monthly verifications",
            values: {
              free: "3",
              personal: "Unlimited",
              business: "Unlimited",
              enterprise: "Unlimited",
            },
          },
          {
            name: "Bulk verification",
            values: {
              free: false,
              personal: false,
              business: true,
              enterprise: true,
            },
          },
        ],
      },
    ];

    render(<PricingTable tiers={tiers} groups={groups} />);

    const quotaRow = screen
      .getByRole("rowheader", { name: /monthly verifications/i })
      .closest("tr") as HTMLTableRowElement;
    const quotaCells = within(quotaRow).getAllByRole("cell");
    expect(quotaCells).toHaveLength(tiers.length);
    expect(quotaCells[0]).toHaveTextContent("3");
    expect(quotaCells[1]).toHaveTextContent("Unlimited");

    const bulkRow = screen
      .getByRole("rowheader", { name: /bulk verification/i })
      .closest("tr") as HTMLTableRowElement;
    const bulkCells = within(bulkRow).getAllByRole("cell");
    expect(
      within(bulkCells[0]).getByTestId("feature-excluded")
    ).toBeInTheDocument();
    expect(bulkCells[0]).toHaveTextContent("Not included");
    expect(
      within(bulkCells[2]).getByTestId("feature-included")
    ).toBeInTheDocument();
    expect(bulkCells[2]).toHaveTextContent("Included");
  });

  it("highlights the popular tier with a badge", () => {
    render(<PricingTable />);
    expect(screen.getByText(/most popular/i)).toBeInTheDocument();
  });

  it("renders a call to action link per tier", () => {
    render(<PricingTable />);

    for (const tier of PRICING_TIER_COLUMNS) {
      const link = screen.getByRole("link", {
        name: new RegExp(`${tier.name}: ${tier.cta}`, "i"),
      });
      expect(link).toHaveAttribute("href", tier.href);
    }
  });
});
