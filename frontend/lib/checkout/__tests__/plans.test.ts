import {
  CHECKOUT_CURRENCY,
  CHECKOUT_PLANS,
  DEFAULT_BILLING_PERIOD,
  DEFAULT_PLAN_ID,
  formatAmount,
  getCheckoutPlan,
  isBillingPeriod,
  resolvePlanAmount,
} from "@/lib/checkout/plans";

describe("checkout plan catalogue", () => {
  it("mirrors the public pricing page amounts in minor units", () => {
    expect(getCheckoutPlan("personal")).toMatchObject({ monthlyAmount: 900, yearlyAmount: 9000 });
    expect(getCheckoutPlan("business")).toMatchObject({ monthlyAmount: 2900, yearlyAmount: 29000 });
    expect(getCheckoutPlan("enterprise")).toMatchObject({
      monthlyAmount: 9900,
      yearlyAmount: 99000,
    });
  });

  it("prices yearly plans at ten months", () => {
    for (const plan of CHECKOUT_PLANS) {
      expect(plan.yearlyAmount).toBe(plan.monthlyAmount * 10);
    }
  });

  it("does not expose the free tier as payable", () => {
    expect(getCheckoutPlan("free")).toBeNull();
  });

  it("returns null for unknown or non-string ids", () => {
    expect(getCheckoutPlan("platinum")).toBeNull();
    expect(getCheckoutPlan(undefined)).toBeNull();
    expect(getCheckoutPlan(42)).toBeNull();
    expect(getCheckoutPlan({ id: "personal" })).toBeNull();
  });

  it("looks plans up case-insensitively and ignores padding", () => {
    expect(getCheckoutPlan("  PERSONAL ")?.id).toBe("personal");
  });

  it("defaults to the personal monthly plan", () => {
    expect(DEFAULT_PLAN_ID).toBe("personal");
    expect(DEFAULT_BILLING_PERIOD).toBe("monthly");
    expect(CHECKOUT_CURRENCY).toBe("usd");
  });

  it("resolves amounts per billing period", () => {
    const plan = getCheckoutPlan("personal");
    expect(plan).not.toBeNull();
    expect(resolvePlanAmount(plan!, "monthly")).toBe(900);
    expect(resolvePlanAmount(plan!, "yearly")).toBe(9000);
  });

  it("validates billing periods", () => {
    expect(isBillingPeriod("monthly")).toBe(true);
    expect(isBillingPeriod("yearly")).toBe(true);
    expect(isBillingPeriod("weekly")).toBe(false);
    expect(isBillingPeriod(undefined)).toBe(false);
  });

  it("formats minor units as currency", () => {
    expect(formatAmount(900)).toBe("$9.00");
    expect(formatAmount(0)).toBe("$0.00");
    expect(formatAmount(29000)).toBe("$290.00");
    expect(formatAmount(900, "usd")).toBe("$9.00");
  });

  it("falls back to a plain amount for an unusable currency code", () => {
    expect(formatAmount(900, "not-a-currency")).toBe("9.00 NOT-A-CURRENCY");
  });
});
