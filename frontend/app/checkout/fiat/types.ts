/**
 * Shapes exchanged between the fiat checkout UI and the checkout route
 * handlers, with narrow runtime parsers so untrusted JSON never leaks `any`
 * into the component tree.
 */

import type { BillingPeriod } from "@/lib/checkout/plans";

/** Payload of a successful `POST /api/checkout/payment-intent`. */
export interface PaymentSession {
  clientSecret: string;
  /** Server-calculated amount in minor currency units (e.g. 900 = $9.00). */
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  billingPeriod?: BillingPeriod;
  paymentIntentId?: string;
}

/** Payload of a successful `POST /api/checkout/payment-intent/status`. */
export interface VerifiedPayment {
  paymentIntentId: string;
  status: string;
  /** Server-verified settlement flag. Only `true` may be treated as paid. */
  paid: boolean;
  amount: number | null;
  currency: string | null;
  planName: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Pull an `{ error: string }` message out of an API response body. */
export function extractApiError(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  return asNonEmptyString(record.error);
}

/** Parse a create-PaymentIntent response, returning `null` if unusable. */
export function parsePaymentSession(value: unknown): PaymentSession | null {
  const record = asRecord(value);
  if (!record) return null;

  const clientSecret = asNonEmptyString(record.clientSecret);
  const planId = asNonEmptyString(record.planId);
  const planName = asNonEmptyString(record.planName);
  const currency = asNonEmptyString(record.currency);
  if (!clientSecret || !planId || !planName || !currency) return null;
  if (typeof record.amount !== "number" || !Number.isFinite(record.amount)) return null;

  const billingPeriod =
    record.billingPeriod === "monthly" || record.billingPeriod === "yearly"
      ? record.billingPeriod
      : undefined;

  return {
    clientSecret,
    amount: record.amount,
    currency,
    planId,
    planName,
    billingPeriod,
    paymentIntentId: asNonEmptyString(record.paymentIntentId) ?? undefined,
  };
}

/** Parse a verify-status response, returning `null` if unusable. */
export function parseVerifiedPayment(value: unknown): VerifiedPayment | null {
  const record = asRecord(value);
  if (!record) return null;

  const status = asNonEmptyString(record.status);
  if (!status || typeof record.paid !== "boolean") return null;

  return {
    paymentIntentId: asNonEmptyString(record.paymentIntentId) ?? "",
    status,
    paid: record.paid,
    amount: typeof record.amount === "number" && Number.isFinite(record.amount) ? record.amount : null,
    currency: asNonEmptyString(record.currency),
    planName: asNonEmptyString(record.planName),
  };
}
