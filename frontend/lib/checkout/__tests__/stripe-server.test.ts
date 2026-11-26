/**
 * @jest-environment node
 *
 * The server-only Stripe client. Constructing `new Stripe(key)` performs no
 * network traffic, so a dummy test key is enough here.
 */

import {
  getStripeServerClient,
  isStripeConfigured,
  resetStripeServerClient,
  StripeNotConfiguredError,
} from "@/lib/checkout/stripe-server";

const ORIGINAL_KEY = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.STRIPE_SECRET_KEY;
  } else {
    process.env.STRIPE_SECRET_KEY = ORIGINAL_KEY;
  }
  resetStripeServerClient();
});

describe("stripe-server", () => {
  it("reports when no secret key is configured", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeConfigured()).toBe(false);

    process.env.STRIPE_SECRET_KEY = "   ";
    expect(isStripeConfigured()).toBe(false);

    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    expect(isStripeConfigured()).toBe(true);
  });

  it("throws StripeNotConfiguredError when the secret key is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripeServerClient()).toThrow(StripeNotConfiguredError);
  });

  it("memoises the client for a given secret key", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const first = getStripeServerClient();
    const second = getStripeServerClient();
    expect(second).toBe(first);
  });

  it("rebuilds the client when the secret key changes", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_one";
    const first = getStripeServerClient();
    process.env.STRIPE_SECRET_KEY = "sk_test_two";
    expect(getStripeServerClient()).not.toBe(first);
  });
});
