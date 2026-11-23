/**
 * Server-only Stripe client.
 *
 * This module reads `STRIPE_SECRET_KEY`, which must NEVER reach the browser.
 * It is imported exclusively by route handlers under `app/api/checkout/`.
 * Importing it from a client component would be a security bug, so the factory
 * throws if it ever executes in a browser-like environment.
 */

import Stripe from "stripe";

/** Thrown when the server is missing its Stripe credentials. */
export class StripeNotConfiguredError extends Error {
  constructor(message = "Payments are not configured on the server") {
    super(message);
    this.name = "StripeNotConfiguredError";
  }
}

let cachedClient: Stripe | null = null;
let cachedKey: string | null = null;

/** `true` when a server-side Stripe secret key is available. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * Lazily create (and memoise) the Stripe SDK client.
 *
 * @throws {StripeNotConfiguredError} when `STRIPE_SECRET_KEY` is not set.
 */
export function getStripeServerClient(): Stripe {
  if (typeof window !== "undefined") {
    throw new Error(
      "lib/checkout/stripe-server is server-only and must not be imported by client code",
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new StripeNotConfiguredError();
  }

  if (!cachedClient || cachedKey !== secretKey) {
    cachedClient = new Stripe(secretKey, {
      appInfo: { name: "StellarProof Fiat Checkout", url: "https://stellarproof.app" },
    });
    cachedKey = secretKey;
  }

  return cachedClient;
}

/** Test helper: drop the memoised client so a new secret key is picked up. */
export function resetStripeServerClient(): void {
  cachedClient = null;
  cachedKey = null;
}
