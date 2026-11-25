/**
 * POST /api/checkout/payment-intent
 *
 * Creates a Stripe PaymentIntent for a plan in the server-held catalogue and
 * returns its `client_secret` so the browser can mount Stripe Elements.
 *
 * SECURITY:
 *  - The request body carries a plan identifier only. The payable amount is
 *    always derived from `lib/checkout/plans` on the server, so the client can
 *    neither choose nor influence the price. Unknown plans are rejected.
 *  - The endpoint fails closed in production while the deployment has no
 *    server-side authentication (`lib/checkout/availability`), because an
 *    anonymous caller must not be able to drive the Stripe API.
 *  - Requests are rate limited per requester (`lib/checkout/rate-limit`).
 *  - A server-derived order key (`lib/checkout/order-identity`) is used as the
 *    Stripe idempotency key, so repeated requests for the same order return the
 *    same PaymentIntent instead of creating a second payable one, and an order
 *    that has already settled is refused rather than charged twice.
 */

import {
  CHECKOUT_CURRENCY,
  DEFAULT_BILLING_PERIOD,
  getCheckoutPlan,
  isBillingPeriod,
  resolvePlanAmount,
  type BillingPeriod,
} from "@/lib/checkout/plans";
import { API_ERRORS } from "@/lib/checkout/messages";
import { getStripeServerClient, StripeNotConfiguredError } from "@/lib/checkout/stripe-server";
import { isCheckoutAvailable } from "@/lib/checkout/availability";
import { CREATE_INTENT_LIMIT, consumeRateLimit, getRequesterKey } from "@/lib/checkout/rate-limit";
import { deriveOrderKey, isAlreadySettled } from "@/lib/checkout/order-identity";

/** Stripe's Node SDK needs the Node.js runtime (not the edge runtime). */
export const runtime = "nodejs";

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  billingPeriod: BillingPeriod;
  paymentIntentId: string;
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  // Fail closed: no server-side auth means no verified payer in production.
  if (!isCheckoutAvailable()) {
    return errorResponse(API_ERRORS.UNAVAILABLE, 503);
  }

  const requester = getRequesterKey(request);
  const rateLimit = consumeRateLimit(`create:${requester}`, CREATE_INTENT_LIMIT);
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

  const { planId, billingPeriod } = body as { planId?: unknown; billingPeriod?: unknown };

  if (typeof planId !== "string" || planId.trim() === "") {
    return errorResponse(API_ERRORS.MISSING_PLAN, 400);
  }

  if (billingPeriod !== undefined && !isBillingPeriod(billingPeriod)) {
    return errorResponse(API_ERRORS.INVALID_BILLING_PERIOD, 400);
  }

  const plan = getCheckoutPlan(planId);
  if (!plan) {
    return errorResponse(API_ERRORS.UNKNOWN_PLAN, 400);
  }

  const period: BillingPeriod = isBillingPeriod(billingPeriod)
    ? billingPeriod
    : DEFAULT_BILLING_PERIOD;

  // Authoritative, server-side amount. Never read from the request.
  const amount = resolvePlanAmount(plan, period);

  let stripe;
  try {
    stripe = getStripeServerClient();
  } catch (error) {
    if (error instanceof StripeNotConfiguredError) {
      return errorResponse(API_ERRORS.NOT_CONFIGURED, 500);
    }
    throw error;
  }

  // Identity of this logical order, derived only from server-validated values.
  const orderKey = deriveOrderKey({ planId: plan.id, billingPeriod: period, requester });

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: CHECKOUT_CURRENCY,
        automatic_payment_methods: { enabled: true },
        description: `StellarProof ${plan.name} plan (${period})`,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          billingPeriod: period,
          source: "fiat-checkout",
          orderKey,
        },
      },
      // Stripe - not this process - dedupes, so this holds across instances.
      { idempotencyKey: orderKey },
    );

    // The idempotent create returned an intent that is already paid: this order
    // is settled, so starting another payment for it would double-charge.
    if (isAlreadySettled(paymentIntent.status)) {
      return errorResponse(API_ERRORS.ALREADY_PAID, 409);
    }

    if (!paymentIntent.client_secret) {
      return errorResponse(API_ERRORS.CREATE_FAILED, 502);
    }

    const payload: CreatePaymentIntentResponse = {
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      planId: plan.id,
      planName: plan.name,
      billingPeriod: period,
      paymentIntentId: paymentIntent.id,
    };

    return Response.json(payload, { status: 200 });
  } catch (error) {
    console.error("[checkout] failed to create PaymentIntent", error);
    return errorResponse(API_ERRORS.CREATE_FAILED, 502);
  }
}
