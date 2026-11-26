/**
 * Every user-visible / API-visible string produced by the fiat checkout flow.
 *
 * They live in one place so the UI, the route handlers and the tests all assert
 * on the same text. Plain strings only - safe to import from server and client.
 */

/** Error payloads returned by the checkout route handlers. */
export const API_ERRORS = {
  /** 400 - body was not valid JSON. */
  INVALID_BODY: "Invalid request body",
  /** 400 - `planId` missing or not a string. */
  MISSING_PLAN: "A valid planId is required",
  /** 400 - `planId` is not a payable plan. */
  UNKNOWN_PLAN: "Unknown or unsupported plan",
  /** 400 - `billingPeriod` present but not monthly/yearly. */
  INVALID_BILLING_PERIOD: 'billingPeriod must be "monthly" or "yearly"',
  /** 400 - status check called without an id/secret pair. */
  MISSING_PAYMENT_REFERENCE: "paymentIntentId and clientSecret are required",
  /** 403 - the supplied client secret does not belong to the PaymentIntent. */
  UNAUTHORIZED_PAYMENT: "Payment session could not be authorized",
  /** 500 - `STRIPE_SECRET_KEY` is not configured. */
  NOT_CONFIGURED: "Payments are not configured on the server",
  /** 502 - Stripe rejected or could not serve the request. */
  CREATE_FAILED: "Unable to create a payment session",
  /** 502 - Stripe could not be reached while verifying a payment. */
  VERIFY_FAILED: "Unable to verify the payment status",
  /** 429 - too many requests from the same requester. */
  RATE_LIMITED: "Too many payment requests. Please wait a moment and try again",
  /**
   * 503 - the endpoint is disabled because the deployment has no server-side
   * authentication to identify the payer. See lib/checkout/availability.
   */
  UNAVAILABLE: "Card checkout is not available in this deployment",
  /** 409 - this order has already been paid; a repeat must not charge again. */
  ALREADY_PAID: "This order has already been paid",
} as const;

/** Strings rendered by the checkout UI. */
export const UI_MESSAGES = {
  /** Shown instead of the form when the publishable key is absent. */
  UNAVAILABLE_TITLE: "Card payments are not configured",
  UNAVAILABLE_BODY:
    "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (and the server-side STRIPE_SECRET_KEY) to enable the secure Stripe payment form.",
  /** Shown while the PaymentIntent is being created. */
  LOADING: "Preparing secure payment form...",
  /** PaymentIntent request returned a non-OK response with no error body. */
  INIT_FAILED: "We could not start a secure payment session. Please try again.",
  /** PaymentIntent request threw (offline, DNS, CORS...). */
  NETWORK_FAILED: "We could not reach the payment service. Please check your connection and try again.",
  /** Submit was attempted before Stripe.js finished loading. */
  STRIPE_NOT_READY: "The payment form is still loading. Please try again in a moment.",
  /** Stripe returned no usable error message. */
  CONFIRM_FAILED: "Your payment could not be completed. Please try again.",
  /** PaymentIntent came back needing extra authentication. */
  REQUIRES_ACTION: "Additional authentication is required to complete this payment.",
  /** PaymentIntent was canceled. */
  CANCELED: "This payment was canceled. Please start a new checkout.",
  /** Stripe accepted the payment but it has not settled yet. */
  PROCESSING: "Your payment is still processing. We will email you as soon as it completes.",
  /** The server-side verification call failed or disagreed with the browser. */
  VERIFICATION_FAILED:
    "We could not verify your payment with our server. Please contact support before trying again.",
  /** Success heading. */
  SUCCESS_TITLE: "Payment successful",
  /** Idle submit button suffix, prefixed with the formatted amount. */
  SUBMIT_SUFFIX: "securely",
  /** Submit button label while a payment is in flight. */
  SUBMITTING: "Processing payment...",
  /** Retry button on an initialization error. */
  RETRY: "Try again",
  /** Billing email hint (the field is required: Stripe needs a receipt address). */
  EMAIL_HINT: "Required. Your receipt is emailed to this address.",
  /** Billing email left blank. */
  EMAIL_REQUIRED: "Enter the billing email address for your receipt.",
  /** Billing email present but not a usable address. */
  EMAIL_INVALID: "Enter a valid email address, for example you@example.com.",
  /** Announced when a submission is blocked by field validation. */
  VALIDATION_FAILED: "Check the highlighted field and try again.",
} as const;
