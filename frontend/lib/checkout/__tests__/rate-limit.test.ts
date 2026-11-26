/** @jest-environment node */

/**
 * Fixed-window rate limiting for the checkout endpoints.
 */

import {
  CREATE_INTENT_LIMIT,
  consumeRateLimit,
  getRequesterKey,
  resetRateLimits,
} from "@/lib/checkout/rate-limit";

beforeEach(() => {
  resetRateLimits();
});

function request(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/checkout/payment-intent", {
    method: "POST",
    headers,
  });
}

describe("getRequesterKey", () => {
  it("prefers the first x-forwarded-for hop", () => {
    expect(getRequesterKey(request({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(getRequesterKey(request({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("falls back to a constant when no proxy header is present", () => {
    expect(getRequesterKey(request({}))).toBe("unknown");
  });
});

describe("consumeRateLimit", () => {
  const options = { limit: 3, windowMs: 60_000 };

  it("allows requests up to the limit", () => {
    for (let i = 0; i < options.limit; i += 1) {
      expect(consumeRateLimit("a", options).allowed).toBe(true);
    }
  });

  it("blocks the request after the limit and reports a retry delay", () => {
    for (let i = 0; i < options.limit; i += 1) consumeRateLimit("a", options);

    const blocked = consumeRateLimit("a", options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("counts each requester separately", () => {
    for (let i = 0; i < options.limit; i += 1) consumeRateLimit("a", options);

    expect(consumeRateLimit("a", options).allowed).toBe(false);
    expect(consumeRateLimit("b", options).allowed).toBe(true);
  });

  it("counts each endpoint budget separately", () => {
    for (let i = 0; i < options.limit; i += 1) consumeRateLimit("create:a", options);

    expect(consumeRateLimit("create:a", options).allowed).toBe(false);
    expect(consumeRateLimit("status:a", options).allowed).toBe(true);
  });

  it("starts a fresh window once the previous one has elapsed", () => {
    const now = Date.now();
    const nowSpy = jest.spyOn(Date, "now");

    nowSpy.mockReturnValue(now);
    for (let i = 0; i < options.limit; i += 1) consumeRateLimit("a", options);
    expect(consumeRateLimit("a", options).allowed).toBe(false);

    nowSpy.mockReturnValue(now + options.windowMs + 1);
    expect(consumeRateLimit("a", options).allowed).toBe(true);

    nowSpy.mockRestore();
  });

  it("budgets PaymentIntent creation more tightly than status checks", () => {
    expect(CREATE_INTENT_LIMIT.limit).toBeLessThan(30);
    expect(CREATE_INTENT_LIMIT.windowMs).toBe(60_000);
  });
});
