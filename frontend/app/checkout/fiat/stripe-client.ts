"use client";

/**
 * Browser-side Stripe.js loader.
 *
 * Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is ever used here - the secret key
 * lives exclusively in `lib/checkout/stripe-server.ts` and never ships to the
 * browser. When the publishable key is absent (as in a fresh checkout of this
 * repo, and in CI) `getStripePromise()` returns `null` and the UI renders a
 * configuration notice instead of a dead payment form.
 */

import { loadStripe, type Stripe } from "@stripe/stripe-js";

/** Memoised per key so Stripe.js is injected into the page at most once. */
const stripePromises = new Map<string, Promise<Stripe | null>>();

/** The configured publishable key, or `undefined` when it is missing/blank. */
export function getStripePublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (typeof key !== "string") return undefined;
  const trimmed = key.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Promise resolving to the Stripe.js instance, or `null` when no publishable
 * key is configured (callers must handle `null` by degrading gracefully).
 */
export function getStripePromise(): Promise<Stripe | null> | null {
  const key = getStripePublishableKey();
  if (!key) return null;

  const existing = stripePromises.get(key);
  if (existing) return existing;

  const created = loadStripe(key);
  stripePromises.set(key, created);
  return created;
}

/** Test helper: forget the memoised Stripe.js promises. */
export function resetStripePromise(): void {
  stripePromises.clear();
}
