/**
 * Server-derived order identity used as the Stripe idempotency key.
 */

import { ORDER_WINDOW_MS, deriveOrderKey, isAlreadySettled } from "@/lib/checkout/order-identity";

const BASE = {
  planId: "personal",
  billingPeriod: "monthly" as const,
  requester: "203.0.113.7",
  now: 1_700_000_000_000,
};

describe("deriveOrderKey", () => {
  it("is stable for the same order within one window", () => {
    expect(deriveOrderKey(BASE)).toBe(deriveOrderKey(BASE));
  });

  it("is stable across the whole window, so a retry reuses the PaymentIntent", () => {
    const bucketStart = Math.floor(BASE.now / ORDER_WINDOW_MS) * ORDER_WINDOW_MS;

    expect(deriveOrderKey({ ...BASE, now: bucketStart })).toBe(
      deriveOrderKey({ ...BASE, now: bucketStart + ORDER_WINDOW_MS - 1 }),
    );
  });

  it("differs per plan", () => {
    expect(deriveOrderKey(BASE)).not.toBe(deriveOrderKey({ ...BASE, planId: "business" }));
  });

  it("differs per billing period", () => {
    expect(deriveOrderKey(BASE)).not.toBe(deriveOrderKey({ ...BASE, billingPeriod: "yearly" }));
  });

  it("differs per requester", () => {
    expect(deriveOrderKey(BASE)).not.toBe(deriveOrderKey({ ...BASE, requester: "198.51.100.4" }));
  });

  it("rolls over into a new window so a later purchase is a new order", () => {
    expect(deriveOrderKey(BASE)).not.toBe(
      deriveOrderKey({ ...BASE, now: BASE.now + ORDER_WINDOW_MS }),
    );
  });

  it("never leaks the requester fingerprint into the key", () => {
    const key = deriveOrderKey(BASE);

    expect(key).not.toContain(BASE.requester);
    expect(key).toMatch(/^checkout_[0-9a-f]{48}$/);
  });

  it("defaults the clock to now", () => {
    expect(() => deriveOrderKey({ ...BASE, now: undefined })).not.toThrow();
  });
});

describe("isAlreadySettled", () => {
  it("treats only a succeeded intent as settled", () => {
    expect(isAlreadySettled("succeeded")).toBe(true);
  });

  it("lets a payable intent through", () => {
    for (const status of [
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "canceled",
    ]) {
      expect(isAlreadySettled(status)).toBe(false);
    }
  });
});
