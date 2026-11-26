/**
 * Unit tests for the Stripe integration added by issue #407.
 *
 * Stripe.js and @stripe/react-stripe-js are fully mocked, so these tests need
 * no credentials and make no network calls.
 *
 * Owned by issue #407. The broad end-to-end page/flow coverage lives in issue
 * #409's app/checkout/__tests__/fiat-checkout.test.tsx - do not duplicate it
 * here.
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UI_MESSAGES } from "@/lib/checkout/messages";

import FiatCheckout from "../FiatCheckout";
import FiatPaymentForm from "../FiatPaymentForm";
import { resetStripePromise } from "../stripe-client";

jest.mock("@stripe/stripe-js", () => ({
  __esModule: true,
  loadStripe: jest.fn(() => Promise.resolve({ __brand: "stripe-mock" })),
}));

jest.mock("@stripe/react-stripe-js", () => {
  const react = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    Elements: ({ children }: { children?: ReactNode }) =>
      react.createElement("div", { "data-testid": "stripe-elements" }, children),
    PaymentElement: () =>
      react.createElement("div", { "data-testid": "stripe-payment-element" }, "stripe iframe"),
    useStripe: jest.fn(),
    useElements: jest.fn(),
  };
});

// Imported after the jest.mock factory above so these are the mocked hooks.
import { useElements, useStripe } from "@stripe/react-stripe-js";

const mockedUseStripe = useStripe as jest.MockedFunction<typeof useStripe>;
const mockedUseElements = useElements as jest.MockedFunction<typeof useElements>;

const PUBLISHABLE_KEY = "pk_test_407_fake";
const CLIENT_SECRET = "pi_test_407_secret_abc";

type ConfirmPayment = jest.Mock;

const elementsStub = { submit: jest.fn() };

function stubStripe(confirmPayment: ConfirmPayment) {
  mockedUseStripe.mockReturnValue({ confirmPayment } as unknown as ReturnType<typeof useStripe>);
  mockedUseElements.mockReturnValue(elementsStub as unknown as ReturnType<typeof useElements>);
}

function okJson(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function errorJson(status: number, body: unknown): Response {
  return { ok: false, status, json: async () => body } as unknown as Response;
}

const SESSION_BODY = {
  clientSecret: CLIENT_SECRET,
  amount: 900,
  currency: "usd",
  planId: "personal",
  planName: "Personal",
  billingPeriod: "monthly",
  paymentIntentId: "pi_test_407",
};

const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();

beforeEach(() => {
  jest.clearAllMocks();
  resetStripePromise();
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = PUBLISHABLE_KEY;
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedUseStripe.mockReturnValue(null);
  mockedUseElements.mockReturnValue(null);
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
});

/**
 * Fills the now-required billing email, then submits.
 *
 * `fireEvent.change` rather than `userEvent.type`: one controlled update keeps
 * this suite fast given how many tests submit the form.
 */
async function payNow(email = "ada@example.com") {
  fireEvent.change(screen.getByLabelText(/billing email/i), { target: { value: email } });
  await userEvent.click(screen.getByRole("button", { name: /pay/i }));
}

describe("FiatCheckout - graceful degradation", () => {
  it("shows a configuration notice and no payment form when the publishable key is absent", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    render(<FiatCheckout />);

    expect(screen.getByTestId("stripe-unavailable")).toBeInTheDocument();
    expect(screen.getByText(UI_MESSAGES.UNAVAILABLE_TITLE)).toBeInTheDocument();
    expect(screen.queryByTestId("stripe-elements")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still renders the order summary with the catalogue total while unconfigured", () => {
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    render(<FiatCheckout />);

    expect(screen.getByTestId("order-summary")).toBeInTheDocument();
    expect(screen.getByTestId("payment-total")).toHaveTextContent("$9.00");
  });

  it("never renders raw card, expiry or CVC inputs", async () => {
    fetchMock.mockResolvedValue(okJson(SESSION_BODY));
    stubStripe(jest.fn());

    render(<FiatCheckout />);
    await screen.findByTestId("stripe-elements");

    expect(screen.queryByPlaceholderText(/4242/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Card number$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^CVC$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Expiration$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Cardholder name$/)).not.toBeInTheDocument();
  });
});

describe("FiatCheckout - PaymentIntent bootstrap", () => {
  it("requests a PaymentIntent with only a plan identifier and mounts Stripe Elements", async () => {
    fetchMock.mockResolvedValue(okJson(SESSION_BODY));
    stubStripe(jest.fn());

    render(<FiatCheckout />);

    expect(screen.getByTestId("payment-loading")).toBeInTheDocument();

    expect(await screen.findByTestId("stripe-elements")).toBeInTheDocument();
    expect(screen.getByTestId("stripe-payment-element")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/checkout/payment-intent");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      planId: "personal",
      billingPeriod: "monthly",
    });
  });

  it("forwards an explicit plan and billing period", async () => {
    fetchMock.mockResolvedValue(
      okJson({ ...SESSION_BODY, amount: 29000, planId: "business", planName: "Business" }),
    );
    stubStripe(jest.fn());

    render(<FiatCheckout planId="business" billingPeriod="yearly" />);

    await screen.findByTestId("stripe-elements");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      planId: "business",
      billingPeriod: "yearly",
    });
    expect(screen.getByTestId("payment-total")).toHaveTextContent("$290.00");
  });

  it("shows the server error message and a retry control when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(errorJson(500, { error: "Payments are not configured on the server" }));

    render(<FiatCheckout />);

    const error = await screen.findByTestId("payment-error");
    expect(error).toHaveAttribute("role", "alert");
    expect(error).toHaveTextContent("Payments are not configured on the server");

    fetchMock.mockResolvedValueOnce(okJson(SESSION_BODY));
    stubStripe(jest.fn());

    await userEvent.click(screen.getByRole("button", { name: UI_MESSAGES.RETRY }));

    expect(await screen.findByTestId("stripe-elements")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a network failure without crashing", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<FiatCheckout />);

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.NETWORK_FAILED,
    );
  });

  it("falls back to a generic message when the error body is unusable", async () => {
    fetchMock.mockResolvedValue(errorJson(502, {}));

    render(<FiatCheckout />);

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.INIT_FAILED);
  });

  it("rejects a malformed success payload", async () => {
    fetchMock.mockResolvedValue(okJson({ amount: 900 }));

    render(<FiatCheckout />);

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.INIT_FAILED);
  });
});

describe("FiatPaymentForm", () => {
  const onPaymentVerified = jest.fn();

  function renderForm() {
    return render(
      <FiatPaymentForm
        clientSecret={CLIENT_SECRET}
        amount={900}
        currency="usd"
        onPaymentVerified={onPaymentVerified}
      />,
    );
  }

  it("renders the Stripe payment element, an email field and a priced submit button", () => {
    stubStripe(jest.fn());
    renderForm();

    expect(screen.getByTestId("stripe-payment-element")).toBeInTheDocument();

    const email = screen.getByLabelText(/billing email/i);
    expect(email).toHaveAttribute("type", "email");

    const button = screen.getByRole("button", { name: /pay \$9\.00 securely/i });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("disables the submit button until Stripe.js has loaded", () => {
    mockedUseStripe.mockReturnValue(null);
    mockedUseElements.mockReturnValue(null);
    renderForm();

    expect(screen.getByRole("button", { name: /pay \$9\.00 securely/i })).toBeDisabled();
  });

  it("confirms the payment and verifies it server-side before reporting success", async () => {
    const confirmPayment = jest.fn().mockResolvedValue({
      paymentIntent: { id: "pi_test_407", status: "succeeded" },
    });
    stubStripe(confirmPayment);
    fetchMock.mockResolvedValue(
      okJson({
        paymentIntentId: "pi_test_407",
        status: "succeeded",
        paid: true,
        amount: 900,
        currency: "usd",
        planId: "personal",
        planName: "Personal",
      }),
    );

    renderForm();

    await payNow();

    await waitFor(() => expect(onPaymentVerified).toHaveBeenCalledTimes(1));

    expect(confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: elementsStub,
        clientSecret: CLIENT_SECRET,
        redirect: "if_required",
        confirmParams: expect.objectContaining({ receipt_email: "ada@example.com" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/checkout/payment-intent/status",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      paymentIntentId: "pi_test_407",
      clientSecret: CLIENT_SECRET,
    });
    expect(onPaymentVerified).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, paymentIntentId: "pi_test_407" }),
    );
    expect(screen.queryByTestId("payment-error")).not.toBeInTheDocument();
  });

  it("marks the billing email as required", () => {
    stubStripe(jest.fn());
    renderForm();

    const email = screen.getByLabelText(/billing email/i);
    expect(email).toBeRequired();
    expect(email).toHaveAttribute("aria-required", "true");
    expect(email).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText(UI_MESSAGES.EMAIL_HINT)).toBeInTheDocument();
  });

  it("blocks a submission with no billing email and never calls Stripe", async () => {
    const confirmPayment = jest.fn();
    stubStripe(confirmPayment);
    renderForm();

    await userEvent.click(screen.getByTestId("submit-payment"));

    const fieldError = screen.getByTestId("billing-email-error");
    expect(fieldError).toHaveTextContent(UI_MESSAGES.EMAIL_REQUIRED);
    expect(fieldError).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/billing email/i)).toHaveAttribute("aria-invalid", "true");
    expect(confirmPayment).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks a submission with a malformed billing email", async () => {
    const confirmPayment = jest.fn();
    stubStripe(confirmPayment);
    renderForm();

    await userEvent.type(screen.getByLabelText(/billing email/i), "not-an-email");
    await userEvent.click(screen.getByTestId("submit-payment"));

    expect(screen.getByTestId("billing-email-error")).toHaveTextContent(UI_MESSAGES.EMAIL_INVALID);
    expect(confirmPayment).not.toHaveBeenCalled();
  });

  it("describes the invalid field through aria-describedby", async () => {
    stubStripe(jest.fn());
    renderForm();

    await userEvent.click(screen.getByTestId("submit-payment"));

    const describedBy = screen
      .getByLabelText(/billing email/i)
      .getAttribute("aria-describedby");
    expect(describedBy).toContain("billing-email-error");
    expect(describedBy).toContain("billing-email-hint");
  });

  it("clears the validation error once the address is corrected", async () => {
    const confirmPayment = jest.fn().mockResolvedValue({
      paymentIntent: { id: "pi_test_407", status: "succeeded" },
    });
    stubStripe(confirmPayment);
    fetchMock.mockResolvedValue(
      okJson({ paymentIntentId: "pi_test_407", status: "succeeded", paid: true }),
    );
    renderForm();

    await userEvent.click(screen.getByTestId("submit-payment"));
    expect(screen.getByTestId("billing-email-error")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/billing email/i), "ada@example.com");
    expect(screen.queryByTestId("billing-email-error")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("submit-payment"));
    await waitFor(() => expect(confirmPayment).toHaveBeenCalledTimes(1));
    expect(confirmPayment.mock.calls[0][0].confirmParams).toHaveProperty(
      "receipt_email",
      "ada@example.com",
    );
  });

  it("shows a processing label and disables the button while in flight", async () => {
    let release: ((value: unknown) => void) | undefined;
    const confirmPayment = jest.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    stubStripe(confirmPayment as unknown as jest.Mock);
    fetchMock.mockResolvedValue(
      okJson({ paymentIntentId: "pi_test_407", status: "succeeded", paid: true }),
    );

    renderForm();
    fireEvent.change(screen.getByLabelText(/billing email/i), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /pay \$9\.00 securely/i }));

    const button = await screen.findByRole("button", { name: new RegExp(UI_MESSAGES.SUBMITTING.replace(/\./g, "\\."), "i") });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    release?.({ paymentIntent: { id: "pi_test_407", status: "succeeded" } });
    await waitFor(() => expect(onPaymentVerified).toHaveBeenCalled());
  });

  it("prevents duplicate submissions", async () => {
    let release: ((value: unknown) => void) | undefined;
    const confirmPayment = jest.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    stubStripe(confirmPayment as unknown as jest.Mock);
    fetchMock.mockResolvedValue(
      okJson({ paymentIntentId: "pi_test_407", status: "succeeded", paid: true }),
    );

    renderForm();
    const form = screen.getByTestId("fiat-payment-form");
    // The email is required, so set it synchronously before the submit burst.
    fireEvent.change(screen.getByLabelText(/billing email/i), {
      target: { value: "ada@example.com" },
    });

    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(confirmPayment).toHaveBeenCalledTimes(1);

    release?.({ paymentIntent: { id: "pi_test_407", status: "succeeded" } });
    await waitFor(() => expect(onPaymentVerified).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a card decline and re-enables the button", async () => {
    const confirmPayment = jest.fn().mockResolvedValue({
      error: { type: "card_error", code: "card_declined", message: "Your card was declined." },
    });
    stubStripe(confirmPayment);

    renderForm();
    await payNow();

    const error = await screen.findByTestId("payment-error");
    expect(error).toHaveAttribute("role", "alert");
    expect(error).toHaveTextContent("Your card was declined.");
    expect(onPaymentVerified).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /pay \$9\.00 securely/i })).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when Stripe gives no error text", async () => {
    stubStripe(jest.fn().mockResolvedValue({ error: { type: "api_error" } }));

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.CONFIRM_FAILED,
    );
  });

  it("reports when further authentication is required", async () => {
    stubStripe(
      jest.fn().mockResolvedValue({ paymentIntent: { id: "pi_a", status: "requires_action" } }),
    );

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.REQUIRES_ACTION,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a canceled PaymentIntent", async () => {
    stubStripe(jest.fn().mockResolvedValue({ paymentIntent: { id: "pi_c", status: "canceled" } }));

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.CANCELED);
  });

  it("does not trust a browser-reported success the server will not confirm", async () => {
    stubStripe(
      jest.fn().mockResolvedValue({ paymentIntent: { id: "pi_x", status: "succeeded" } }),
    );
    fetchMock.mockResolvedValue(
      okJson({ paymentIntentId: "pi_x", status: "requires_payment_method", paid: false }),
    );

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.VERIFICATION_FAILED,
    );
    expect(onPaymentVerified).not.toHaveBeenCalled();
  });

  it("explains an unsettled payment that is still processing", async () => {
    stubStripe(
      jest.fn().mockResolvedValue({ paymentIntent: { id: "pi_p", status: "processing" } }),
    );
    fetchMock.mockResolvedValue(
      okJson({ paymentIntentId: "pi_p", status: "processing", paid: false }),
    );

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(UI_MESSAGES.PROCESSING);
    expect(onPaymentVerified).not.toHaveBeenCalled();
  });

  it("reports a failed server verification call", async () => {
    stubStripe(
      jest.fn().mockResolvedValue({ paymentIntent: { id: "pi_v", status: "succeeded" } }),
    );
    fetchMock.mockResolvedValue(errorJson(403, { error: "Payment session could not be authorized" }));

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      "Payment session could not be authorized",
    );
    expect(onPaymentVerified).not.toHaveBeenCalled();
  });

  it("recovers from an exception thrown by confirmPayment", async () => {
    stubStripe(jest.fn().mockRejectedValue(new Error("boom")));

    renderForm();
    await payNow();

    expect(await screen.findByTestId("payment-error")).toHaveTextContent(
      UI_MESSAGES.NETWORK_FAILED,
    );
    expect(screen.getByRole("button", { name: /pay \$9\.00 securely/i })).toBeEnabled();
  });
});

describe("FiatCheckout - verified success state", () => {
  it("renders the success panel only after the server confirms the payment", async () => {
    fetchMock
      .mockResolvedValueOnce(okJson(SESSION_BODY))
      .mockResolvedValueOnce(
        okJson({
          paymentIntentId: "pi_test_407",
          status: "succeeded",
          paid: true,
          amount: 900,
          currency: "usd",
          planId: "personal",
          planName: "Personal",
        }),
      );
    stubStripe(
      jest.fn().mockResolvedValue({ paymentIntent: { id: "pi_test_407", status: "succeeded" } }),
    );

    render(<FiatCheckout />);

    await screen.findByTestId("stripe-elements");
    expect(screen.queryByTestId("payment-success")).not.toBeInTheDocument();

    await payNow();

    const success = await screen.findByTestId("payment-success");
    expect(success).toHaveTextContent(UI_MESSAGES.SUCCESS_TITLE);
    expect(success).toHaveTextContent("$9.00");
    expect(screen.getByTestId("payment-reference")).toHaveTextContent("pi_test_407");
    expect(screen.queryByTestId("fiat-payment-form")).not.toBeInTheDocument();
  });
});
