/**
 * @jest-environment node
 *
 * Unit tests for the checkout route handlers. Stripe itself is replaced by a
 * fake client so no network traffic and no credentials are required.
 *
 * Owned by issue #407. Broad page/flow coverage lives in issue #409's
 * app/checkout/__tests__/fiat-checkout.test.tsx.
 */

import { API_ERRORS } from "@/lib/checkout/messages";
import { getStripeServerClient, StripeNotConfiguredError } from "@/lib/checkout/stripe-server";
import { CREATE_INTENT_LIMIT, resetRateLimits } from "@/lib/checkout/rate-limit";

import { POST as createPaymentIntent } from "../route";
import { POST as getPaymentIntentStatus } from "../status/route";

jest.mock("@/lib/checkout/stripe-server", () => {
  class MockStripeNotConfiguredError extends Error {
    constructor(message = "Payments are not configured on the server") {
      super(message);
      this.name = "StripeNotConfiguredError";
    }
  }

  return {
    __esModule: true,
    StripeNotConfiguredError: MockStripeNotConfiguredError,
    isStripeConfigured: jest.fn(() => true),
    getStripeServerClient: jest.fn(),
    resetStripeServerClient: jest.fn(),
  };
});

const mockedGetClient = getStripeServerClient as jest.MockedFunction<typeof getStripeServerClient>;
const create = jest.fn();
const retrieve = jest.fn();

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Like `jsonRequest`, but tagged with a requester so limiter buckets differ. */
function jsonRequestFrom(url: string, body: unknown, ip: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function rawRequest(url: string, body: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

const CREATE_URL = "http://localhost/api/checkout/payment-intent";
const STATUS_URL = "http://localhost/api/checkout/payment-intent/status";

beforeEach(() => {
  jest.clearAllMocks();
  // The limiter counts per requester in module memory, and every request in
  // this suite looks like the same anonymous caller.
  resetRateLimits();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedGetClient.mockReturnValue({ paymentIntents: { create, retrieve } } as unknown as ReturnType<
    typeof getStripeServerClient
  >);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("POST /api/checkout/payment-intent", () => {
  it("creates a PaymentIntent using the server-held amount for the plan", async () => {
    create.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "pi_test_123_secret_abc",
      amount: 900,
      currency: "usd",
    });

    const response = await createPaymentIntent(
      jsonRequest(CREATE_URL, { planId: "personal", billingPeriod: "monthly" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      clientSecret: "pi_test_123_secret_abc",
      amount: 900,
      currency: "usd",
      planId: "personal",
      planName: "Personal",
      billingPeriod: "monthly",
      paymentIntentId: "pi_test_123",
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 900,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: expect.objectContaining({ planId: "personal", billingPeriod: "monthly" }),
      }),
      // Server-derived idempotency key: Stripe dedupes repeats of this order.
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it("defaults to monthly billing when no period is supplied", async () => {
    create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret",
      amount: 2900,
      currency: "usd",
    });

    const response = await createPaymentIntent(jsonRequest(CREATE_URL, { planId: "business" }));

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2900 }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
    await expect(response.json()).resolves.toMatchObject({ billingPeriod: "monthly" });
  });

  it("charges ten months for a yearly billing period", async () => {
    create.mockResolvedValue({
      id: "pi_2",
      client_secret: "pi_2_secret",
      amount: 9000,
      currency: "usd",
    });

    await createPaymentIntent(
      jsonRequest(CREATE_URL, { planId: "personal", billingPeriod: "yearly" }),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 9000 }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it("ignores any amount supplied by the client", async () => {
    create.mockResolvedValue({
      id: "pi_3",
      client_secret: "pi_3_secret",
      amount: 900,
      currency: "usd",
    });

    const response = await createPaymentIntent(
      jsonRequest(CREATE_URL, { planId: "personal", amount: 1, currency: "zzz" }),
    );

    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 900, currency: "usd" }),
      expect.objectContaining({ idempotencyKey: expect.any(String) }),
    );
  });

  it("rejects an unknown plan with 400", async () => {
    const response = await createPaymentIntent(jsonRequest(CREATE_URL, { planId: "platinum" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.UNKNOWN_PLAN });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects the unpayable free tier with 400", async () => {
    const response = await createPaymentIntent(jsonRequest(CREATE_URL, { planId: "free" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.UNKNOWN_PLAN });
  });

  it("rejects a missing planId with 400", async () => {
    const response = await createPaymentIntent(jsonRequest(CREATE_URL, {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.MISSING_PLAN });
  });

  it("rejects an invalid billing period with 400", async () => {
    const response = await createPaymentIntent(
      jsonRequest(CREATE_URL, { planId: "personal", billingPeriod: "weekly" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: API_ERRORS.INVALID_BILLING_PERIOD,
    });
  });

  it("rejects a malformed body with 400", async () => {
    const response = await createPaymentIntent(rawRequest(CREATE_URL, "{not json"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.INVALID_BODY });
  });

  it("returns 500 when the server has no Stripe secret key", async () => {
    mockedGetClient.mockImplementation(() => {
      throw new StripeNotConfiguredError();
    });

    const response = await createPaymentIntent(jsonRequest(CREATE_URL, { planId: "personal" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.NOT_CONFIGURED });
  });

  it("returns 502 when Stripe rejects the request", async () => {
    create.mockRejectedValue(new Error("stripe is down"));

    const response = await createPaymentIntent(jsonRequest(CREATE_URL, { planId: "personal" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.CREATE_FAILED });
  });

  it("returns 502 when Stripe omits the client secret", async () => {
    create.mockResolvedValue({ id: "pi_4", client_secret: null, amount: 900, currency: "usd" });

    const response = await createPaymentIntent(jsonRequest(CREATE_URL, { planId: "personal" }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.CREATE_FAILED });
  });
});

describe("POST /api/checkout/payment-intent/status", () => {
  it("reports a server-verified successful payment", async () => {
    retrieve.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "pi_test_123_secret_abc",
      status: "succeeded",
      amount: 900,
      currency: "usd",
      metadata: { planId: "personal", planName: "Personal" },
    });

    const response = await getPaymentIntentStatus(
      jsonRequest(STATUS_URL, {
        paymentIntentId: "pi_test_123",
        clientSecret: "pi_test_123_secret_abc",
      }),
    );

    expect(retrieve).toHaveBeenCalledWith("pi_test_123");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      paymentIntentId: "pi_test_123",
      status: "succeeded",
      paid: true,
      amount: 900,
      currency: "usd",
      planId: "personal",
      planName: "Personal",
    });
  });

  it("does not mark an unsettled PaymentIntent as paid", async () => {
    retrieve.mockResolvedValue({
      id: "pi_5",
      client_secret: "pi_5_secret",
      status: "requires_payment_method",
      amount: 900,
      currency: "usd",
      metadata: {},
    });

    const response = await getPaymentIntentStatus(
      jsonRequest(STATUS_URL, { paymentIntentId: "pi_5", clientSecret: "pi_5_secret" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      paid: false,
      status: "requires_payment_method",
      planId: null,
      planName: null,
    });
  });

  it("returns 403 when the client secret does not match the PaymentIntent", async () => {
    retrieve.mockResolvedValue({
      id: "pi_6",
      client_secret: "pi_6_secret_real",
      status: "succeeded",
      amount: 900,
      currency: "usd",
      metadata: {},
    });

    const response = await getPaymentIntentStatus(
      jsonRequest(STATUS_URL, { paymentIntentId: "pi_6", clientSecret: "pi_6_secret_fake" }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.UNAUTHORIZED_PAYMENT });
  });

  it("returns 400 when the reference pair is incomplete", async () => {
    const response = await getPaymentIntentStatus(
      jsonRequest(STATUS_URL, { paymentIntentId: "pi_7" }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: API_ERRORS.MISSING_PAYMENT_REFERENCE,
    });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("returns 500 when the server has no Stripe secret key", async () => {
    mockedGetClient.mockImplementation(() => {
      throw new StripeNotConfiguredError();
    });

    const response = await getPaymentIntentStatus(
      jsonRequest(STATUS_URL, { paymentIntentId: "pi_8", clientSecret: "pi_8_secret" }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.NOT_CONFIGURED });
  });

  it("returns 502 when Stripe cannot be reached", async () => {
    retrieve.mockRejectedValue(new Error("no such payment intent"));

    const response = await getPaymentIntentStatus(
      jsonRequest(STATUS_URL, { paymentIntentId: "pi_9", clientSecret: "pi_9_secret" }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.VERIFY_FAILED });
  });
});

describe("checkout endpoint safeguards", () => {
  it("passes a stable, server-derived idempotency key for the same order", async () => {
    create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret",
      amount: 900,
      currency: "usd",
      status: "requires_payment_method",
    });

    await createPaymentIntent(jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.9"));
    await createPaymentIntent(jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.9"));

    const first = create.mock.calls[0][1]?.idempotencyKey;
    const second = create.mock.calls[1][1]?.idempotencyKey;

    expect(first).toMatch(/^checkout_[0-9a-f]{48}$/);
    // Same key => Stripe returns the SAME PaymentIntent, so a repeated request
    // cannot create a second payable intent for this order.
    expect(second).toBe(first);
    // The requester fingerprint must not travel to Stripe in clear text.
    expect(first).not.toContain("203.0.113.9");
  });

  it("derives a different order key for a different plan", async () => {
    create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret",
      amount: 900,
      currency: "usd",
      status: "requires_payment_method",
    });

    await createPaymentIntent(jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.9"));
    await createPaymentIntent(jsonRequestFrom(CREATE_URL, { planId: "business" }, "203.0.113.9"));

    expect(create.mock.calls[1][1]?.idempotencyKey).not.toBe(
      create.mock.calls[0][1]?.idempotencyKey,
    );
  });

  it("refuses to start a second payment for an order that already succeeded", async () => {
    // The idempotent create returns the original, already-paid intent.
    create.mockResolvedValue({
      id: "pi_paid",
      client_secret: "pi_paid_secret",
      amount: 900,
      currency: "usd",
      status: "succeeded",
    });

    const response = await createPaymentIntent(
      jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.10"),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: API_ERRORS.ALREADY_PAID });
  });

  it("rate limits repeated PaymentIntent creation and sets Retry-After", async () => {
    create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret",
      amount: 900,
      currency: "usd",
      status: "requires_payment_method",
    });

    const burst = async () =>
      createPaymentIntent(jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.11"));

    let limited: Response | undefined;
    for (let i = 0; i < CREATE_INTENT_LIMIT.limit + 1; i += 1) {
      const response = await burst();
      if (response.status === 429) {
        limited = response;
        break;
      }
    }

    expect(limited).toBeDefined();
    expect(limited?.status).toBe(429);
    expect(Number(limited?.headers.get("Retry-After"))).toBeGreaterThan(0);
    await expect(limited?.json()).resolves.toEqual({ error: API_ERRORS.RATE_LIMITED });
    // The over-limit request must not reach Stripe.
    expect(create).toHaveBeenCalledTimes(CREATE_INTENT_LIMIT.limit);
  });

  it("rate limits the status endpoint independently of creation", async () => {
    create.mockResolvedValue({
      id: "pi_1",
      client_secret: "pi_1_secret",
      amount: 900,
      currency: "usd",
      status: "requires_payment_method",
    });

    for (let i = 0; i < CREATE_INTENT_LIMIT.limit; i += 1) {
      await createPaymentIntent(jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.12"));
    }

    retrieve.mockResolvedValue({
      id: "pi_test_123",
      client_secret: "pi_test_123_secret_abc",
      status: "succeeded",
      amount: 900,
      currency: "usd",
      metadata: {},
    });

    // Creation is exhausted for this requester; verification still works.
    const status = await getPaymentIntentStatus(
      jsonRequestFrom(
        STATUS_URL,
        { paymentIntentId: "pi_test_123", clientSecret: "pi_test_123_secret_abc" },
        "203.0.113.12",
      ),
    );

    expect(status.status).toBe(200);
  });

  describe("production fail-closed gate", () => {
    const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

    function setNodeEnv(value: string | undefined): void {
      (process.env as Record<string, string | undefined>).NODE_ENV = value;
    }

    afterEach(() => {
      setNodeEnv(ORIGINAL_NODE_ENV);
    });

    it("returns 503 and never calls Stripe when creating in production", async () => {
      setNodeEnv("production");

      const response = await createPaymentIntent(
        jsonRequestFrom(CREATE_URL, { planId: "personal" }, "203.0.113.13"),
      );

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ error: API_ERRORS.UNAVAILABLE });
      expect(create).not.toHaveBeenCalled();
    });

    it("returns 503 and never calls Stripe when verifying in production", async () => {
      setNodeEnv("production");

      const response = await getPaymentIntentStatus(
        jsonRequestFrom(
          STATUS_URL,
          { paymentIntentId: "pi_test_123", clientSecret: "pi_test_123_secret_abc" },
          "203.0.113.14",
        ),
      );

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ error: API_ERRORS.UNAVAILABLE });
      expect(retrieve).not.toHaveBeenCalled();
    });
  });
});
