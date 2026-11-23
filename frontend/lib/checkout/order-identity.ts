/**
 * Server-derived order identity, used to stop repeated requests creating
 * duplicate payments for the same order.
 *
 * DESIGN
 * ------
 * The key is computed entirely on the server from values the client cannot
 * choose freely: the resolved plan id, the resolved billing period, a requester
 * fingerprint taken from proxy headers, and a coarse time bucket. A
 * client-supplied identifier is deliberately NOT part of it - an untrusted
 * caller could vary its own id to defeat the protection, so it would add the
 * appearance of safety without the substance.
 *
 * The key is handed to Stripe as an idempotency key. That is what makes this
 * work across server instances: Stripe, not this process's memory, is the
 * authority. Two identical create calls return the SAME PaymentIntent, so a
 * page refresh, a double-submit or a retried fetch cannot produce a second
 * payable intent for the same order. The handler can then look at that intent's
 * status and refuse to start a fresh payment for an order already settled.
 *
 * LIMITATIONS
 * -----------
 *  - The requester fingerprint is an IP from proxy headers, which is a weak and
 *    spoofable identity. The correct input is an authenticated user id; see
 *    `lib/checkout/availability.ts` for why that is not available yet. Until
 *    then two users behind one NAT and buying the same plan in the same bucket
 *    would share an order key and so share a PaymentIntent - which is precisely
 *    why the endpoints fail closed in production.
 *  - Buckets have edges: a retry that straddles one derives a new key and so a
 *    new intent.
 *  - Stripe expires idempotency keys after ~24h, which is far longer than a
 *    checkout session, so that is not a practical concern.
 */

import { createHash } from "node:crypto";

import type { BillingPeriod } from "./plans";

/** Length of the time bucket that scopes one logical order attempt. */
export const ORDER_WINDOW_MS = 15 * 60_000;

export interface OrderIdentityInput {
  /** Plan id AFTER server-side catalogue validation. */
  planId: string;
  /** Billing period AFTER server-side validation. */
  billingPeriod: BillingPeriod;
  /** Requester fingerprint (see `getRequesterKey`). */
  requester: string;
  /** Injectable for tests; defaults to now. */
  now?: number;
}

/**
 * Returns the stable idempotency key for one logical order attempt.
 *
 * Hashed so the key never carries the requester's IP to Stripe in clear text.
 */
export function deriveOrderKey({
  planId,
  billingPeriod,
  requester,
  now = Date.now(),
}: OrderIdentityInput): string {
  const bucket = Math.floor(now / ORDER_WINDOW_MS);
  const digest = createHash("sha256")
    .update(`${planId}|${billingPeriod}|${requester}|${bucket}`)
    .digest("hex");

  return `checkout_${digest.slice(0, 48)}`;
}

/**
 * PaymentIntent statuses that mean this order is already settled, so starting
 * another payment for it would charge the customer twice.
 */
export function isAlreadySettled(status: string): boolean {
  return status === "succeeded";
}
