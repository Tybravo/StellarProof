/**
 * Unit tests for the pricing page: the tiers it renders and the toggle logic
 * behind the billing period, the currency and the saved plan preference.
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import PricingPage from "../page";

// The site header pulls in the wallet modal, the theme toggle and network
// badges; none of that is under test here.
jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="site-header" />,
}));

const mockUseAuth = jest.fn();
jest.mock("@/app/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const TIERS = [
  {
    name: "Free",
    monthly: { usd: "$0", xlm: "0 XLM" },
    yearly: { usd: "$0", xlm: "0 XLM" },
    cta: "Get Started",
    href: "/verify",
  },
  {
    name: "Personal",
    monthly: { usd: "$9", xlm: "50 XLM" },
    yearly: { usd: "$90", xlm: "500 XLM" },
    cta: "Get Started",
    href: "/verify",
  },
  {
    name: "Business",
    monthly: { usd: "$29", xlm: "150 XLM" },
    yearly: { usd: "$290", xlm: "1500 XLM" },
    cta: "Get Started",
    href: "/verify",
  },
  {
    name: "Enterprise",
    monthly: { usd: "$99", xlm: "500 XLM" },
    yearly: { usd: "$990", xlm: "5000 XLM" },
    cta: "Contact Sales",
    href: "/contact",
  },
];

/** The pricing cards, so queries are not confused by other page sections. */
function cards() {
  return within(screen.getByTestId("pricing-cards"));
}

/** A single tier card, located by its heading. */
function card(name: string): HTMLElement {
  const heading = cards().getByRole("heading", { name, level: 3 });
  const element = heading.closest("div");
  if (!element) throw new Error(`No card found for tier ${name}`);
  return element;
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({ isAuthenticated: false });
});

describe("tier rendering", () => {
  it("renders the page heading", () => {
    render(<PricingPage />);

    expect(
      screen.getByRole("heading", { name: /simple, transparent pricing/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders every tier once", () => {
    render(<PricingPage />);

    const headings = cards().getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(
      TIERS.map((tier) => tier.name),
    );
  });

  it.each(TIERS)("renders the $name tier price and call to action", (tier) => {
    render(<PricingPage />);

    const tierCard = within(card(tier.name));
    expect(tierCard.getByText(tier.monthly.usd)).toBeInTheDocument();
    expect(tierCard.getByText("/month")).toBeInTheDocument();
    expect(tierCard.getByRole("link", { name: tier.cta })).toHaveAttribute("href", tier.href);
  });

  it("lists the features of a tier", () => {
    render(<PricingPage />);

    const business = within(card("Business"));
    expect(business.getByText("Team workspace")).toBeInTheDocument();
    expect(business.getByText("API access")).toBeInTheDocument();
    expect(business.getByText("Analytics dashboard")).toBeInTheDocument();
  });

  it("marks only the Personal tier as most popular", () => {
    render(<PricingPage />);

    const badges = cards().getAllByText(/most popular/i);
    expect(badges).toHaveLength(1);
    expect(card("Personal")).toContainElement(badges[0]);
  });

  it("renders the frequently asked questions", () => {
    render(<PricingPage />);

    expect(screen.getByRole("heading", { name: /can i switch plans\?/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /do you offer refunds\?/i })).toBeInTheDocument();
  });
});

describe("billing period toggle", () => {
  it("starts on monthly", () => {
    render(<PricingPage />);

    expect(screen.getByRole("button", { name: "Monthly" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Yearly" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("switches every tier to its yearly price", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "Yearly" }));

    TIERS.forEach((tier) => {
      const tierCard = within(card(tier.name));
      expect(tierCard.getByText(tier.yearly.usd)).toBeInTheDocument();
      expect(tierCard.getByText("/year")).toBeInTheDocument();
    });
  });

  it("charges ten months for a year, and says so on the paid tiers", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "Yearly" }));

    expect(cards().getAllByText(/two months free/i)).toHaveLength(3);
    expect(within(card("Free")).queryByText(/two months free/i)).not.toBeInTheDocument();
  });

  it("switches back to monthly prices", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    await user.click(screen.getByRole("button", { name: "Monthly" }));

    const personal = within(card("Personal"));
    expect(personal.getByText("$9")).toBeInTheDocument();
    expect(personal.getByText("/month")).toBeInTheDocument();
    expect(personal.queryByText("$90")).not.toBeInTheDocument();
  });
});

describe("currency toggle", () => {
  it("shows XLM prices when XLM is selected", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "XLM" }));

    TIERS.forEach((tier) => {
      expect(within(card(tier.name)).getByText(tier.monthly.xlm)).toBeInTheDocument();
    });
  });

  it("combines with the billing period", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "XLM" }));
    await user.click(screen.getByRole("button", { name: "Yearly" }));

    TIERS.forEach((tier) => {
      const tierCard = within(card(tier.name));
      expect(tierCard.getByText(tier.yearly.xlm)).toBeInTheDocument();
      expect(tierCard.getByText("/year")).toBeInTheDocument();
    });
  });

  it("returns to USD prices", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "XLM" }));
    await user.click(screen.getByRole("button", { name: "USD" }));

    expect(within(card("Business")).getByText("$29")).toBeInTheDocument();
  });
});

describe("yearly savings", () => {
  // Ten months charged for twelve, so the saving is two months of the plan.
  const SAVINGS = [
    { name: "Personal", usd: "$18", xlm: "100 XLM" },
    { name: "Business", usd: "$58", xlm: "300 XLM" },
    { name: "Enterprise", usd: "$198", xlm: "1000 XLM" },
  ];

  it.each(SAVINGS)("states the $name saving in USD", async (tier) => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "Yearly" }));

    expect(
      within(card(tier.name)).getByText(`Save ${tier.usd} — two months free`),
    ).toBeInTheDocument();
  });

  it.each(SAVINGS)("states the $name saving in XLM", async (tier) => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "XLM" }));
    await user.click(screen.getByRole("button", { name: "Yearly" }));

    expect(
      within(card(tier.name)).getByText(`Save ${tier.xlm} — two months free`),
    ).toBeInTheDocument();
  });

  it("shows no saving while monthly billing is selected", () => {
    render(<PricingPage />);

    expect(cards().queryByText(/two months free/i)).not.toBeInTheDocument();
  });
});

describe("comparison table", () => {
  /** The Personal column header, which repeats that plan's price. */
  function personalColumn() {
    return within(screen.getByRole("table")).getByRole("columnheader", {
      name: /^Personal/,
    });
  }

  it("prices its columns for the selected billing period", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    expect(personalColumn()).toHaveTextContent("$9/mo");

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(personalColumn()).toHaveTextContent("$90/yr");

    await user.click(screen.getByRole("button", { name: "Monthly" }));
    expect(personalColumn()).toHaveTextContent("$9/mo");
  });

  it("follows the selected currency too", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    await user.click(screen.getByRole("button", { name: "XLM" }));
    expect(personalColumn()).toHaveTextContent("50 XLM/mo");

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(personalColumn()).toHaveTextContent("500 XLM/yr");
  });

  it("keeps the Free plan free under both billing periods", async () => {
    const user = userEvent.setup();
    render(<PricingPage />);

    const freeCard = () => within(card("Free"));
    expect(freeCard().getByText("$0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yearly" }));
    expect(freeCard().getByText("$0")).toBeInTheDocument();
    expect(freeCard().getByText("/year")).toBeInTheDocument();
  });
});

describe("plan preference", () => {
  it("is disabled, with a prompt to log in, for signed-out visitors", () => {
    render(<PricingPage />);

    expect(screen.getByRole("button", { name: /select plan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save preference/i })).toBeDisabled();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
  });

  it("saves the chosen plan once a tier is picked by a signed-in user", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<PricingPage />);

    const saveButton = screen.getByRole("button", { name: /save preference/i });
    expect(saveButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /select plan/i }));
    await user.click(screen.getByRole("button", { name: "Business" }));

    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(alertSpy).toHaveBeenCalledWith("Saved pricing preference: Business");
    alertSpy.mockRestore();
  });
});
