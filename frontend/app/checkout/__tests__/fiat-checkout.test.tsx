/**
 * Unit tests for the fiat (credit card) checkout flow - issue #409.
 *
 * These are the broad page/flow tests for the Stripe checkout screen added by
 * issue #407: they render `app/checkout/fiat/page.tsx` and drive the whole
 * journey (bootstrap -> Elements -> confirm -> server verification) rather than
 * unit-testing the individual components, which issue #407 already covers in
 * `app/checkout/fiat/__tests__/stripe-payment-form.test.tsx`.
 *
 * Stripe.js and `@stripe/react-stripe-js` are fully mocked and `global.fetch`
 * is stubbed, so nothing here needs credentials, a network or a real iframe.
 *
 * Asserted strings are imported from `@/lib/checkout/messages` and
 * `@/lib/checkout/plans` so the tests stay coupled to the implementation's own
 * copy rather than to duplicated literals.
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { UI_MESSAGES } from "@/lib/checkout/messages";
import { formatAmount } from "@/lib/checkout/plans";

import FiatCheckoutPage, { metadata } from "../fiat/page";
import FiatCheckout from "../fiat/FiatCheckout";
import { resetStripePromise } from "../fiat/stripe-client";

jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="site-header" />,
}));

jest.mock("@stripe/stripe-js", () => ({
  __esModule: true,
  loadStripe: jest.fn(() => Promise.resolve({ __brand: "stripe-mock" })),
}));

jest.mock("@stripe/react-stripe-js", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  // Records the props `<Elements>` was mounted with so the tests can assert on
  // the Stripe instance and the client-secret-bearing options.
  const elementsSpy = jest.fn();

  return {
    __esModule: true,
    __elementsSpy: elementsSpy,
    Elements: (props: { children?: ReactNode; stripe?: unknown; options?: unknown }) => {
      elementsSpy(props);
      return react.createElement("div", { "data-testid": "stripe-elements" }, props.children);
    },
    PaymentElement: (props: { options?: unknown }) =>
      react.createElement(
        "div",
        { "data-testid": "stripe-payment-element", "data-layout": String((props.options as { layout?: string } | undefined)?.layout) },
        "stripe hosted card iframe",
      ),
    useStripe: jest.fn(),
    useElements: jest.fn(),
  };
});

// Imported after the factories above, so these are the mocked modules.
import { loadStripe } from "@stripe/stripe-js";
import * as reactStripe from "@stripe/react-stripe-js";
import { useElements, useStripe } from "@stripe/react-stripe-js";

const mockedLoadStripe = loadStripe as jest.MockedFunction<typeof loadStripe>;
const mockedUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockedUseElements = useElements as jest.MockedFunction<typeof useElements>;
const elementsSpy = (reactStripe as unknown as { __elementsSpy: jest.Mock }).__elementsSpy;

const PUBLISHABLE_KEY = "pk_test_409_fake";
const CLIENT_SECRET = "pi_409_secret_fake";
const PAYMENT_INTENT_ID = "pi_409";

const PERSONAL_MONTHLY = 900;
const PRICE_LABEL = formatAmount(PERSONAL_MONTHLY, "usd");
const SUBMIT_LABEL = `Pay ${PRICE_LABEL} ${UI_MESSAGES.SUBMIT_SUFFIX}`;

/** A successful `POST /api/checkout/payment-intent` body. */
const SESSION_BODY = {
  clientSecret: CLIENT_SECRET,
  amount: PERSONAL_MONTHLY,
  currency: "usd",
  planId: "personal",
  planName: "Personal",
  billingPeriod: "monthly",
  paymentIntentId: PAYMENT_INTENT_ID,
};

/** A successful `POST /api/checkout/payment-intent/status` body. */
const VERIFIED_BODY = {
  paymentIntentId: PAYMENT_INTENT_ID,
  status: "succeeded",
  paid: true,
  amount: PERSONAL_MONTHLY,
  currency: "usd",
  planName: "Personal",
};

const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function errorJson(status: number, body: unknown): Response {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

/** Promise whose settlement the test controls, for asserting interim states. */
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const elementsStub = { submit: jest.fn() };

/** Make `useStripe()`/`useElements()` behave like a loaded Stripe.js. */
function stubStripe(confirmPayment: jest.Mock): void {
  mockedUseStripe.mockReturnValue({ confirmPayment } as unknown as ReturnType<typeof useStripe>);
  mockedUseElements.mockReturnValue(elementsStub as unknown as ReturnType<typeof useElements>);
}

function confirmsWith(result: unknown): jest.Mock {
  const confirmPayment = jest.fn().mockResolvedValue(result);
  stubStripe(confirmPayment);
  return confirmPayment;
}

function renderPage() {
  return render(<FiatCheckoutPage />);
}

/** Render the page and wait for the Stripe form to be mounted. */
async function renderReadyPage(): Promise<void> {
  renderPage();
  await screen.findByTestId("fiat-payment-form");
}

const submitButton = () => screen.getByRole("button", { name: SUBMIT_LABEL });

/** Sets the required billing email in one controlled update. */
function fillEmail(value = "ada@example.com"): void {
  fireEvent.change(screen.getByLabelText("Billing email"), { target: { value } });
}

/** Fills the required billing email, then submits the form. */
async function submitPayment(): Promise<void> {
  fillEmail();
  await userEvent.click(submitButton());
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  resetStripePromise();
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = PUBLISHABLE_KEY;
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedUseStripe.mockReturnValue(null);
  mockedUseElements.mockReturnValue(null);
  fetchMock.mockResolvedValue(okJson(SESSION_BODY));
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
});

describe("Fiat checkout page - rendering", () => {
  it("renders the page shell, site header and main landmark", async () => {
    confirmsWith({});
    renderPage();

    expect(screen.getByTestId("fiat-checkout-page")).toBeInTheDocument();
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");

    await screen.findByTestId("fiat-payment-form");
  });

  it("renders the secure-checkout heading", async () => {
    confirmsWith({});
    renderPage();

    expect(screen.getByText("Secure checkout")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Pay with credit card" }),
    ).toBeInTheDocument();

    await screen.findByTestId("fiat-payment-form");
  });

  it("renders the payment form and the order summary together", async () => {
    confirmsWith({});
    await renderReadyPage();

    expect(screen.getByTestId("fiat-payment-form")).toBeInTheDocument();
    expect(screen.getByTestId("order-summary")).toBeInTheDocument();
  });

  it("exposes route metadata for the checkout screen", () => {
    expect(metadata.title).toBe("Secure card checkout | StellarProof");
    expect(metadata.description).toContain("Stripe");
  });
});

describe("Order summary and payment amount display", () => {
  it("renders the plan, processing fee and total rows", async () => {
    confirmsWith({});
    await renderReadyPage();

    const summary = screen.getByTestId("order-summary");
    expect(within(summary).getByRole("heading", { level: 2, name: "Order summary" })).toBeInTheDocument();
    expect(within(summary).getByText("Personal plan")).toBeInTheDocument();
    expect(within(summary).getByTestId("plan-amount")).toHaveTextContent(PRICE_LABEL);
    expect(within(summary).getByText("Processing fee")).toBeInTheDocument();
    expect(within(summary).getByText(formatAmount(0, "usd"))).toBeInTheDocument();
    expect(within(summary).getByText("Total")).toBeInTheDocument();
    expect(within(summary).getByTestId("payment-total")).toHaveTextContent(PRICE_LABEL);
  });

  it("marks the summary busy while the authoritative amount is loading, then idle", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    confirmsWith({});

    renderPage();

    expect(screen.getByTestId("order-summary")).toHaveAttribute("aria-busy", "true");

    pending.resolve(okJson(SESSION_BODY));

    await screen.findByTestId("fiat-payment-form");
    expect(screen.getByTestId("order-summary")).toHaveAttribute("aria-busy", "false");
  });

  it("prefers the server-calculated amount over the local catalogue price", async () => {
    fetchMock.mockResolvedValue(okJson({ ...SESSION_BODY, amount: 1234 }));
    confirmsWith({});

    await renderReadyPage();

    const expected = formatAmount(1234, "usd");
    expect(screen.getByTestId("plan-amount")).toHaveTextContent(expected);
    expect(screen.getByTestId("payment-total")).toHaveTextContent(expected);
    expect(
      screen.getByRole("button", { name: `Pay ${expected} ${UI_MESSAGES.SUBMIT_SUFFIX}` }),
    ).toBeInTheDocument();
  });

  it("displays the catalogue amount for an explicit plan and billing period", async () => {
    fetchMock.mockResolvedValue(
      okJson({ ...SESSION_BODY, amount: 29000, planId: "business", planName: "Business" }),
    );
    confirmsWith({});

    render(<FiatCheckout planId="business" billingPeriod="yearly" />);
    await screen.findByTestId("fiat-payment-form");

    expect(screen.getByText("Business plan")).toBeInTheDocument();
    expect(screen.getByTestId("payment-total")).toHaveTextContent(formatAmount(29000, "usd"));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      planId: "business",
      billingPeriod: "yearly",
    });
  });

  it("prices the submit button from the payment session", async () => {
    confirmsWith({});
    await renderReadyPage();

    expect(submitButton()).toHaveTextContent(PRICE_LABEL);
  });
});

describe("Stripe Elements initialization", () => {
  it("loads Stripe.js with the publishable key and mounts Elements with the client secret", async () => {
    confirmsWith({});
    await renderReadyPage();

    expect(mockedLoadStripe).toHaveBeenCalledWith(PUBLISHABLE_KEY);
    expect(screen.getByTestId("stripe-elements")).toBeInTheDocument();
    expect(elementsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe: expect.anything(),
        options: expect.objectContaining({ clientSecret: CLIENT_SECRET }),
      }),
    );
  });

  it("collects card data only through Stripe's hosted PaymentElement", async () => {
    confirmsWith({});
    await renderReadyPage();

    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    expect(screen.getByText("Card details")).toBeInTheDocument();
    expect(screen.getByTestId("stripe-payment-element")).toHaveAttribute("data-layout", "tabs");

    // No PAN / expiry / CVC input may exist in this application's own DOM.
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cvc/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/expir/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cardholder/i)).not.toBeInTheDocument();
  });

  it("injects Stripe.js at most once for a given publishable key", async () => {
    confirmsWith({});
    await renderReadyPage();
    await renderReadyPage();

    expect(mockedLoadStripe).toHaveBeenCalledTimes(1);
  });
});

describe("Billing form validation", () => {
  it("renders the billing email as a required field", async () => {
    confirmsWith({});
    await renderReadyPage();

    // Native validation is off: the form reports problems itself so the
    // message can be associated with the field for assistive technology.
    expect(screen.getByTestId("fiat-payment-form")).toHaveAttribute("noValidate");

    const email = screen.getByLabelText("Billing email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("aria-required", "true");
    expect(email).toHaveValue("");
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText(UI_MESSAGES.EMAIL_HINT)).toBeInTheDocument();
    expect(screen.queryByTestId("billing-email-error")).not.toBeInTheDocument();
  });

  it("refuses a submission with the required email missing", async () => {
    const confirmPayment = confirmsWith({
      paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" },
    });

    await renderReadyPage();
    await userEvent.click(submitButton());

    expect(await screen.findByTestId("billing-email-error")).toHaveTextContent(
      UI_MESSAGES.EMAIL_REQUIRED,
    );
    // Prevention: Stripe is never asked to confirm an invalid submission, and
    // no verification call is made either.
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1); // the bootstrap only
  });

  it("treats a whitespace-only email as missing", async () => {
    const confirmPayment = confirmsWith({
      paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" },
    });

    await renderReadyPage();
    fillEmail("   ");
    await userEvent.click(submitButton());

    expect(await screen.findByTestId("billing-email-error")).toHaveTextContent(
      UI_MESSAGES.EMAIL_REQUIRED,
    );
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it.each([
    "not-an-email",
    "ada@",
    "@example.com",
    "ada@example",
    "ada example@test.com",
    "ada@@example.com",
  ])("refuses the malformed address %p", async (value) => {
    const confirmPayment = confirmsWith({
      paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" },
    });

    await renderReadyPage();
    fillEmail(value);
    await userEvent.click(submitButton());

    expect(await screen.findByTestId("billing-email-error")).toHaveTextContent(
      UI_MESSAGES.EMAIL_INVALID,
    );
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("announces the validation failure accessibly and marks the field invalid", async () => {
    confirmsWith({});
    await renderReadyPage();

    await userEvent.click(submitButton());

    const fieldError = await screen.findByTestId("billing-email-error");
    expect(fieldError).toHaveAttribute("role", "alert");
    expect(fieldError).toHaveAttribute("id", "billing-email-error");

    const email = screen.getByLabelText("Billing email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    // The field points at BOTH its error and its hint, so a screen reader
    // announces the problem together with the guidance.
    const describedBy = email.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toEqual(
      expect.arrayContaining(["billing-email-error", "billing-email-hint"]),
    );

    // The form-level alert explains that something needs attention.
    expect(screen.getByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.VALIDATION_FAILED,
    );
  });

  it("moves focus to the field that needs fixing", async () => {
    confirmsWith({});
    await renderReadyPage();

    await userEvent.click(submitButton());

    expect(screen.getByLabelText("Billing email")).toHaveFocus();
  });

  it("accepts valid billing input and forwards the trimmed receipt address", async () => {
    const confirmPayment = confirmsWith({
      paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" },
    });
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    fillEmail("  ada@example.com  ");
    await userEvent.click(submitButton());

    await waitFor(() => expect(confirmPayment).toHaveBeenCalledTimes(1));
    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmParams: expect.objectContaining({ receipt_email: "ada@example.com" }),
      }),
    );
    expect(screen.queryByTestId("billing-email-error")).not.toBeInTheDocument();
  });

  it("clears the validation error as soon as the address is corrected", async () => {
    confirmsWith({});
    await renderReadyPage();

    await userEvent.click(submitButton());
    expect(await screen.findByTestId("billing-email-error")).toBeInTheDocument();

    fillEmail("ada@example.com");

    // Recovery: the field error and the invalid flag both clear on correction.
    expect(screen.queryByTestId("billing-email-error")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Billing email")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Billing email")).toHaveAttribute(
      "aria-describedby",
      "billing-email-hint",
    );
  });

  it("completes the payment after a validation error is corrected", async () => {
    const confirmPayment = confirmsWith({
      paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" },
    });
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();

    // Blocked first...
    await userEvent.click(submitButton());
    expect(await screen.findByTestId("billing-email-error")).toBeInTheDocument();
    expect(confirmPayment).not.toHaveBeenCalled();

    // ...then corrected and accepted.
    fillEmail("ada@example.com");
    await userEvent.click(submitButton());

    await screen.findByTestId("payment-success");
    expect(confirmPayment).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("payment-error")).not.toBeInTheDocument();
  });

  it("locks the billing email field while a payment is in flight", async () => {
    const pendingConfirm = deferred<unknown>();
    stubStripe(jest.fn(() => pendingConfirm.promise));

    await renderReadyPage();
    fillEmail();
    
    fireEvent.click(submitButton());

    await waitFor(() => expect(screen.getByLabelText("Billing email")).toBeDisabled());

    pendingConfirm.resolve({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "canceled" } });
    await screen.findByTestId("payment-error");
  });
});

describe("Payment submission", () => {
  it("confirms the payment with the elements instance, client secret and no redirect", async () => {
    const confirmPayment = confirmsWith({
      paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" },
    });
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    await submitPayment();

    await waitFor(() => expect(confirmPayment).toHaveBeenCalledTimes(1));
    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: elementsStub,
        clientSecret: CLIENT_SECRET,
        redirect: "if_required",
      }),
    );
  });

  it("requests the PaymentIntent with only a plan identifier", async () => {
    confirmsWith({});
    await renderReadyPage();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/checkout/payment-intent");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(String(init?.body))).toEqual({
      planId: "personal",
      billingPeriod: "monthly",
    });
  });

  it("re-checks the confirmed payment against our own server", async () => {
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    await submitPayment();

    await screen.findByTestId("payment-success");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/checkout/payment-intent/status");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      paymentIntentId: PAYMENT_INTENT_ID,
      clientSecret: CLIENT_SECRET,
    });
  });
});

describe("Loading states", () => {
  it("shows the preparing-payment status while the PaymentIntent is created", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);
    confirmsWith({});

    renderPage();

    const loading = screen.getByTestId("payment-loading");
    expect(loading).toHaveAttribute("role", "status");
    expect(loading).toHaveTextContent(UI_MESSAGES.LOADING);
    expect(screen.queryByTestId("stripe-elements")).not.toBeInTheDocument();

    pending.resolve(okJson(SESSION_BODY));

    await screen.findByTestId("fiat-payment-form");
    expect(screen.queryByTestId("payment-loading")).not.toBeInTheDocument();
  });

  it("shows a busy, disabled submit button while the payment is confirming", async () => {
    const pendingConfirm = deferred<unknown>();
    stubStripe(jest.fn(() => pendingConfirm.promise));
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    fillEmail();
    fireEvent.click(submitButton());

    const busy = await screen.findByRole("button", { name: UI_MESSAGES.SUBMITTING });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");

    pendingConfirm.resolve({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });
    await screen.findByTestId("payment-success");
  });
});

describe("Duplicate submission prevention", () => {
  it("confirms only once when the form is submitted repeatedly in one tick", async () => {
    const pendingConfirm = deferred<unknown>();
    const confirmPayment = jest.fn(() => pendingConfirm.promise);
    stubStripe(confirmPayment);
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    const form = screen.getByTestId("fiat-payment-form");
    fillEmail();

    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(confirmPayment).toHaveBeenCalledTimes(1);

    pendingConfirm.resolve({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });
    await screen.findByTestId("payment-success");

    // One bootstrap call plus exactly one verification call.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores a second click because the button is disabled in flight", async () => {
    const pendingConfirm = deferred<unknown>();
    const confirmPayment = jest.fn(() => pendingConfirm.promise);
    stubStripe(confirmPayment);
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    const button = submitButton();
    fillEmail();

    await userEvent.click(button);
    await userEvent.click(button);

    expect(confirmPayment).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();

    pendingConfirm.resolve({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });
    await screen.findByTestId("payment-success");
  });
});

describe("Payment confirmation success", () => {
  it("renders the success panel only after the server verifies the payment", async () => {
    const verification = deferred<Response>();
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockReturnValueOnce(verification.promise);
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });

    await renderReadyPage();
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();

    fillEmail();

    fireEvent.click(submitButton());

    // Stripe has already reported success, but the UI must not trust it yet.
    await screen.findByRole("button", { name: UI_MESSAGES.SUBMITTING });
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();

    verification.resolve(okJson(VERIFIED_BODY));

    const success = await screen.findByTestId("payment-success");
    expect(success).toHaveAttribute("role", "status");
    expect(success).toHaveTextContent(UI_MESSAGES.SUCCESS_TITLE);
    expect(success).toHaveTextContent(PRICE_LABEL);
    expect(success).toHaveTextContent("Personal");
    expect(screen.getByTestId("payment-reference")).toHaveTextContent(PAYMENT_INTENT_ID);
    expect(screen.queryByTestId("fiat-payment-form")).not.toBeInTheDocument();
  });

  it("refuses to show success when the server will not confirm the browser result", async () => {
    fetchMock
      .mockResolvedValueOnce(okJson(SESSION_BODY))
      .mockResolvedValueOnce(
        okJson({ paymentIntentId: PAYMENT_INTENT_ID, status: "requires_payment_method", paid: false }),
      );
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.VERIFICATION_FAILED,
    );
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();
    expect(screen.getByTestId("fiat-payment-form")).toBeInTheDocument();
  });

  it("explains a payment that the server reports as still processing", async () => {
    fetchMock
      .mockResolvedValueOnce(okJson(SESSION_BODY))
      .mockResolvedValueOnce(
        okJson({ paymentIntentId: PAYMENT_INTENT_ID, status: "processing", paid: false }),
      );
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "processing" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.PROCESSING);
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();
  });
});

describe("Payment declines", () => {
  it("surfaces the Stripe decline message and re-enables the form", async () => {
    confirmsWith({
      error: { type: "card_error", code: "card_declined", message: "Your card was declined." },
    });

    await renderReadyPage();
    await submitPayment();

    const error = await screen.findByTestId("payment-error");
    expect(error).toHaveAttribute("role", "alert");
    expect(error).toHaveTextContent("Your card was declined.");
    expect(submitButton()).toBeEnabled();
    // Nothing beyond the bootstrap call: a declined card is never verified.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a generic message when Stripe's error carries no text", async () => {
    confirmsWith({ error: { type: "api_error" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.CONFIRM_FAILED,
    );
  });

  it("falls back to a generic message when no PaymentIntent comes back", async () => {
    confirmsWith({});

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.CONFIRM_FAILED,
    );
  });

  it("reports an unexpected terminal status generically", async () => {
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "requires_payment_method" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.CONFIRM_FAILED,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("Cancellation and additional authentication", () => {
  it("reports a canceled PaymentIntent", async () => {
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "canceled" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.CANCELED);
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();
  });

  it("asks for additional authentication when the intent requires action", async () => {
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "requires_action" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.REQUIRES_ACTION,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks for additional authentication when the intent requires confirmation", async () => {
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "requires_confirmation" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.REQUIRES_ACTION,
    );
  });
});

describe("Network and server errors", () => {
  it("reports an unreachable payment service while bootstrapping", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    renderPage();

    const error = await screen.findByTestId("payment-error");
    expect(error).toHaveAttribute("role", "alert");
    expect(error).toHaveTextContent(UI_MESSAGES.NETWORK_FAILED);
    expect(screen.queryByTestId("fiat-payment-form")).not.toBeInTheDocument();
  });

  it("shows the server's own error message when the bootstrap request fails", async () => {
    fetchMock.mockResolvedValueOnce(
      errorJson(500, { error: "Payments are not configured on the server" }),
    );

    renderPage();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      "Payments are not configured on the server",
    );
  });

  it("falls back to a generic bootstrap message when the error body is unusable", async () => {
    fetchMock.mockResolvedValueOnce(errorJson(502, {}));

    renderPage();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.INIT_FAILED);
  });

  it("rejects a malformed payment session payload", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ amount: PERSONAL_MONTHLY }));

    renderPage();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.INIT_FAILED);
  });

  it("reports an unreachable payment service when confirmPayment rejects", async () => {
    stubStripe(jest.fn().mockRejectedValue(new Error("network down")));

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.NETWORK_FAILED,
    );
    expect(submitButton()).toBeEnabled();
  });

  it("surfaces the server's error when verification is refused", async () => {
    fetchMock
      .mockResolvedValueOnce(okJson(SESSION_BODY))
      .mockResolvedValueOnce(errorJson(403, { error: "Payment session could not be authorized" }));
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      "Payment session could not be authorized",
    );
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();
  });

  it("falls back to the verification message when the failure has no error body", async () => {
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(errorJson(502, {}));
    confirmsWith({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });

    await renderReadyPage();
    await submitPayment();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.VERIFICATION_FAILED,
    );
  });
});

describe("Missing Stripe initialization", () => {
  it("renders a configuration notice and makes no request without a publishable key", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    renderPage();

    const notice = screen.getByTestId("stripe-unavailable");
    expect(notice).toHaveAttribute("role", "status");
    expect(notice).toHaveTextContent(UI_MESSAGES.UNAVAILABLE_TITLE);
    expect(notice).toHaveTextContent("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

    expect(screen.queryByTestId("stripe-elements")).not.toBeInTheDocument();
    expect(screen.queryByTestId("fiat-payment-form")).not.toBeInTheDocument();
    expect(mockedLoadStripe).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still shows the order summary total when card payments are unconfigured", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    renderPage();

    expect(screen.getByTestId("order-summary")).toHaveAttribute("aria-busy", "false");
    expect(screen.getByTestId("payment-total")).toHaveTextContent(PRICE_LABEL);
  });

  it("treats a blank publishable key as unconfigured", () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "   ";

    renderPage();

    expect(screen.getByTestId("stripe-unavailable")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the submit button disabled until Stripe.js and Elements are ready", async () => {
    mockedUseStripe.mockReturnValue(null);
    mockedUseElements.mockReturnValue(null);

    await renderReadyPage();

    expect(submitButton()).toBeDisabled();
  });

  it("reports that the form is still loading if it is submitted before Stripe is ready", async () => {
    mockedUseStripe.mockReturnValue(null);
    mockedUseElements.mockReturnValue(null);

    await renderReadyPage();
    fireEvent.submit(screen.getByTestId("fiat-payment-form"));

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.STRIPE_NOT_READY,
    );
  });
});

describe("Error feedback and recovery", () => {
  it("offers a retry control that recovers from a transient bootstrap failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    renderPage();
    await screen.findByTestId("payment-error");

    const retry = screen.getByTestId("retry-payment-intent");
    expect(retry).toHaveAccessibleName(UI_MESSAGES.RETRY);

    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY));
    confirmsWith({});

    await userEvent.click(retry);

    expect(await screen.findByTestId("fiat-payment-form")).toBeInTheDocument();
    expect(screen.queryByTestId("payment-error")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clears the error and shows the loading state while retrying", async () => {
    fetchMock.mockResolvedValueOnce(errorJson(502, {}));

    renderPage();
    await screen.findByTestId("payment-error");

    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(second.promise);
    confirmsWith({});

    await userEvent.click(screen.getByTestId("retry-payment-intent"));

    expect(screen.getByTestId("payment-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("payment-error")).not.toBeInTheDocument();

    second.resolve(okJson(SESSION_BODY));
    expect(await screen.findByTestId("fiat-payment-form")).toBeInTheDocument();
  });

  it("clears a previous submission error when the payment is retried successfully", async () => {
    const confirmPayment = jest
      .fn()
      .mockResolvedValueOnce({ error: { type: "card_error", message: "Your card was declined." } })
      .mockResolvedValueOnce({ paymentIntent: { id: PAYMENT_INTENT_ID, status: "succeeded" } });
    stubStripe(confirmPayment);
    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY)).mockResolvedValueOnce(okJson(VERIFIED_BODY));

    await renderReadyPage();
    await submitPayment();
    expect(await screen.findByTestId("payment-error")).toHaveTextContent("Your card was declined.");

    await submitPayment();

    await screen.findByTestId("payment-success");
    expect(screen.queryByTestId("payment-error")).not.toBeInTheDocument();
  });
});
