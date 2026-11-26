/**
 * The production fail-closed gate for the checkout endpoints.
 */

import {
  isCheckoutAuthConfigured,
  isCheckoutAvailable,
  isProductionRuntime,
} from "@/lib/checkout/availability";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string | undefined): void {
  // NODE_ENV is typed as a readonly literal union, hence the cast.
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(ORIGINAL_NODE_ENV);
});

describe("checkout availability", () => {
  it("reports that no server-side payer authentication exists yet", () => {
    // Guards the premise of the gate. When real auth lands this flips to true
    // and this expectation should be updated deliberately.
    expect(isCheckoutAuthConfigured()).toBe(false);
  });

  it("detects a production runtime", () => {
    setNodeEnv("production");
    expect(isProductionRuntime()).toBe(true);

    setNodeEnv("development");
    expect(isProductionRuntime()).toBe(false);
  });

  it("fails closed in production while the payer cannot be authenticated", () => {
    setNodeEnv("production");
    expect(isCheckoutAvailable()).toBe(false);
  });

  it("stays open in development and test so the integration is verifiable", () => {
    setNodeEnv("development");
    expect(isCheckoutAvailable()).toBe(true);

    setNodeEnv("test");
    expect(isCheckoutAvailable()).toBe(true);
  });

  it("cannot be re-opened in production through an environment variable", () => {
    setNodeEnv("production");
    // Deliberately no escape hatch: a deployment must implement real auth.
    process.env.CHECKOUT_ALLOW_UNAUTHENTICATED = "true";
    process.env.CHECKOUT_ENABLED = "1";

    expect(isCheckoutAvailable()).toBe(false);

    delete process.env.CHECKOUT_ALLOW_UNAUTHENTICATED;
    delete process.env.CHECKOUT_ENABLED;
  });
});
