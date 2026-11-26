/**
 * POST /api/checkout/payment-intent/status
 *
 * Re-reads a PaymentIntent from Stripe and reports its VERIFIED status.
 *
 * The browser's `stripe.confirmPayment()` result is never treated as proof of
 * payment: the client reports an id, and this handler asks Stripe directly.
 * Only `paid: true` here is authoritative for fulfillment.
 *
 * Authorization: the caller must present the PaymentIntent's `client_secret`
 * (which only the browser session that created the intent possesses). It is
 * compared against the value Stripe returns, so the endpoint cannot be used to
 * enumerate other customers' payments.
 */

import { API_ERRORS } from "@/lib/checkout/messages";
import { getStripeServerClient, StripeNotConfiguredError } from "@/lib/checkout/stripe-server";
import { isCheckoutAvailable } from "@/lib/checkout/availability";
import { STATUS_CHECK_LIMIT, consumeRateLimit, getRequesterKey } from "@/lib/checkout/rate-limit";

/** Stripe's Node SDK needs the Node.js runtime (not the edge runtime). */
export const runtime = "nodejs";

export interface PaymentIntentStatusResponse {
  paymentIntentId: string;
  /** Raw Stripe PaymentIntent status, e.g. "succeeded" | "processing" | ... */
  status: string;
  /** Server-verified settlement flag. The only value safe to fulfill on. */
  paid: boolean;
  amount: number;
  currency: string;
  planId: string | null;
  planName: string | null;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Constant-time-ish comparison so a mismatch does not leak secret length. */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request): Promise<Response> {
  // Mirrors the create route: closed in production until the payer can be
  // authenticated, so a disabled checkout cannot be verified either.
  if (!isCheckoutAvailable()) {
    return errorResponse(API_ERRORS.UNAVAILABLE, 503);
  }

  const rateLimit = consumeRateLimit(`status:${getRequesterKey(request)}`, STATUS_CHECK_LIMIT);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: API_ERRORS.RATE_LIMITED },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(API_ERRORS.INVALID_BODY, 400);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse(API_ERRORS.INVALID_BODY, 400);
  }

  const { paymentIntentId, clientSecret } = body as {
    paymentIntentId?: unknown;
    clientSecret?: unknown;
  };

  if (
    typeof paymentIntentId !== "string" ||
    paymentIntentId.trim() === "" ||
    typeof clientSecret !== "string" ||
    clientSecret.trim() === ""
  ) {
    return errorResponse(API_ERRORS.MISSING_PAYMENT_REFERENCE, 400);
  }

  let stripe;
  try {
    stripe = getStripeServerClient();
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return errorResponse(API_ERRORS.NOT_CONFIGURED, 500);
    }
    throw error;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId.trim());

    if (
      !paymentIntent.client_secret ||
      !secretsMatch(paymentIntent.client_secret, clientSecret.trim())
    ) {
      return errorResponse(API_ERRORS.UNAUTHORIZED_PAYMENT, 403);
    }

    const payload: PaymentIntentStatusResponse = {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      paid: paymentIntent.status === "succeeded",
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      planId: paymentIntent.metadata?.planId ?? null,
      planName: paymentIntent.metadata?.planName ?? null,
    };

    return Response.json(payload, { status: 200 });
  } catch (error) {
    console.error("[checkout] failed to verify PaymentIntent", error);
    return errorResponse(API_ERRORS.VERIFY_FAILED, 502);
  }
}
