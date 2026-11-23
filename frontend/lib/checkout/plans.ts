/**
 * Server-held catalogue of payable checkout plans.
 *
 * The amounts below are the single source of truth for what a customer can be
 * charged. The browser only ever sends a `planId` (and an optional billing
 * period) to `POST /api/checkout/payment-intent`; the amount is always resolved
 * here, on the server, so a tampered request cannot change the price.
 *
 * Amounts mirror `app/pricing/page.tsx` (yearly = ten months, i.e. two free).
 * They are expressed in MINOR currency units (US cents), which is what the
 * Stripe PaymentIntent API expects.
 */

export type BillingPeriod = "monthly" | "yearly";

export interface CheckoutPlan {
  /** Stable identifier sent by the client. */
  id: string;
  /** Human readable name, shown in the order summary. */
  name: string;
  /** Monthly price in minor currency units (e.g. 900 = $9.00). */
  monthlyAmount: number;
  /** Yearly price in minor currency units (e.g. 9000 = $90.00). */
  yearlyAmount: number;
}

/** ISO 4217 currency used for every fiat checkout, lower-cased for Stripe. */
export const CHECKOUT_CURRENCY = "usd";

/**
 * Payable plans. The "Free" tier from the pricing page is intentionally absent:
 * it costs nothing, so it can never produce a PaymentIntent and is rejected as
 * an unsupported plan.
 */
export const CHECKOUT_PLANS: readonly CheckoutPlan[] = [
  { id: "personal", name: "Personal", monthlyAmount: 900, yearlyAmount: 9000 },
  { id: "business", name: "Business", monthlyAmount: 2900, yearlyAmount: 29000 },
  { id: "enterprise", name: "Enterprise", monthlyAmount: 9900, yearlyAmount: 99000 },
];

/** Plan used by the fiat checkout page when no other plan is requested. */
export const DEFAULT_PLAN_ID = "personal";

/** Billing period used when the request does not specify one. */
export const DEFAULT_BILLING_PERIOD: BillingPeriod = "monthly";

/** `true` when `value` is a supported billing period. */
export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

/** Look a plan up by id. Returns `null` for unknown or non-string ids. */
export function getCheckoutPlan(planId: unknown): CheckoutPlan | null {
  if (typeof planId !== "string") return null;
  const normalised = planId.trim().toLowerCase();
  return CHECKOUT_PLANS.find((plan) => plan.id === normalised) ?? null;
}

/** Amount in minor units for a plan on a given billing period. */
export function resolvePlanAmount(plan: CheckoutPlan, billingPeriod: BillingPeriod): number {
  return billingPeriod === "yearly" ? plan.yearlyAmount : plan.monthlyAmount;
}

/**
 * Format a minor-unit amount for display, e.g. `formatAmount(900)` -> `"$9.00"`.
 * Falls back to `"<amount> <CURRENCY>"` if the runtime cannot format the code.
 */
export function formatAmount(minorUnits: number, currency: string = CHECKOUT_CURRENCY): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
