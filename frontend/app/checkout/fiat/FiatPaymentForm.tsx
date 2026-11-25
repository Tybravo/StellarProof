"use client";

/**
 * The card form rendered inside the Stripe `<Elements>` provider.
 *
 * Card data is collected exclusively by Stripe's `<PaymentElement>` iframe, so
 * no PAN / CVC / expiry value ever touches this application or its DOM. On
 * submit we call `stripe.confirmPayment()` and then ALWAYS re-check the result
 * against our own server (`/api/checkout/payment-intent/status`) before showing
 * success: a browser-reported "succeeded" is never authoritative.
 *
 * The billing email is the only field this application owns, and it is
 * required: it is the address Stripe sends the receipt to. It is validated
 * before `confirmPayment` is called, so an invalid submission never reaches
 * Stripe, and the failure is announced through `role="alert"` with
 * `aria-invalid` / `aria-describedby` wired to the input.
 */

import { useRef, useState, type FormEvent } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { AlertCircle, Loader2, Lock } from "lucide-react";

import { UI_MESSAGES } from "@/lib/checkout/messages";
import { formatAmount } from "@/lib/checkout/plans";
import { extractApiError, parseVerifiedPayment, type VerifiedPayment } from "./types";

/**
 * Deliberately permissive: a single `@`, a dotted domain, no whitespace. The
 * authority on deliverability is Stripe (and the receipt itself), so the only
 * job here is to catch obvious mistakes without rejecting valid addresses.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns the validation message for a billing email, or null when it is usable. */
export function validateBillingEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return UI_MESSAGES.EMAIL_REQUIRED;
  if (!EMAIL_PATTERN.test(trimmed)) return UI_MESSAGES.EMAIL_INVALID;
  return null;
}

const INPUT_CLASSES =
  "mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white";

export interface FiatPaymentFormProps {
  /** Client secret of the server-created PaymentIntent. */
  clientSecret: string;
  /** Server-calculated amount in minor units; used for the button label only. */
  amount: number;
  /** ISO currency code of the PaymentIntent. */
  currency: string;
  /** Called once the SERVER has confirmed the payment settled. */
  onPaymentVerified: (payment: VerifiedPayment) => void;
}

export default function FiatPaymentForm({
  clientSecret,
  amount,
  currency,
  onPaymentVerified,
}: FiatPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Belt-and-braces duplicate-submit guard: state updates are async, a ref is not.
  const inFlight = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);

  const isReady = Boolean(stripe && elements);
  const submitLabel = submitting
    ? UI_MESSAGES.SUBMITTING
    : `Pay ${formatAmount(amount, currency)} ${UI_MESSAGES.SUBMIT_SUFFIX}`;

  /** Ask our own server what Stripe really thinks of this PaymentIntent. */
  async function verifyWithServer(paymentIntentId: string): Promise<VerifiedPayment | null> {
    const response = await fetch("/api/checkout/payment-intent/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId, clientSecret }),
    });

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      setErrorMessage(extractApiError(body) ?? UI_MESSAGES.VERIFICATION_FAILED);
      return null;
    }

    const verified = parseVerifiedPayment(body);
    if (!verified) {
      setErrorMessage(UI_MESSAGES.VERIFICATION_FAILED);
      return null;
    }
    if (verified.paid) {
      return verified;
    }
    setErrorMessage(
      verified.status === "processing" ? UI_MESSAGES.PROCESSING : UI_MESSAGES.VERIFICATION_FAILED,
    );
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (inFlight.current || submitting) return;
    if (!stripe || !elements) {
      setErrorMessage(UI_MESSAGES.STRIPE_NOT_READY);
      return;
    }

    // Validate before touching Stripe: an invalid submission must not create a
    // confirmation attempt, and the reason belongs on the offending field.
    const emailProblem = validateBillingEmail(email);
    if (emailProblem) {
      setEmailError(emailProblem);
      setErrorMessage(UI_MESSAGES.VALIDATION_FAILED);
      emailInput.current?.focus();
      return;
    }
    setEmailError(null);

    inFlight.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    let verified: VerifiedPayment | null = null;

    try {
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url:
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}/checkout/fiat`,
          receipt_email: email.trim(),
        },
        redirect: "if_required",
      });

      if (result.error) {
        setErrorMessage(result.error.message ?? UI_MESSAGES.CONFIRM_FAILED);
      } else if (!result.paymentIntent) {
        setErrorMessage(UI_MESSAGES.CONFIRM_FAILED);
      } else {
        const { status, id } = result.paymentIntent;
        if (status === "succeeded" || status === "processing") {
          verified = await verifyWithServer(id);
        } else if (status === "requires_action" || status === "requires_confirmation") {
          setErrorMessage(UI_MESSAGES.REQUIRES_ACTION);
        } else if (status === "canceled") {
          setErrorMessage(UI_MESSAGES.CANCELED);
        } else {
          setErrorMessage(UI_MESSAGES.CONFIRM_FAILED);
        }
      }
    } catch {
      setErrorMessage(UI_MESSAGES.NETWORK_FAILED);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }

    if (verified) {
      onPaymentVerified(verified);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate data-testid="fiat-payment-form">
      <div>
        <label
          htmlFor="billing-email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Billing email
        </label>
        <input
          ref={emailInput}
          id="billing-email"
          name="billing-email"
          type="email"
          autoComplete="email"
          required
          aria-required="true"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            // Recovery: clear the field error as soon as it is being corrected.
            if (emailError) setEmailError(null);
          }}
          disabled={submitting}
          placeholder="you@example.com"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={
            emailError ? "billing-email-error billing-email-hint" : "billing-email-hint"
          }
          className={INPUT_CLASSES}
        />
        {emailError ? (
          <p
            id="billing-email-error"
            role="alert"
            data-testid="billing-email-error"
            className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
          >
            {emailError}
          </p>
        ) : null}
        <p id="billing-email-hint" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {UI_MESSAGES.EMAIL_HINT}
        </p>
      </div>

      <div data-testid="payment-element">
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Card details
        </span>
        <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <PaymentElement options={{ layout: "tabs" }} />
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          data-testid="payment-error"
          className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        data-testid="submit-payment"
        disabled={submitting || !isReady}
        aria-busy={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Lock className="h-5 w-5" aria-hidden />
        )}
        {submitLabel}
      </button>
    </form>
  );
}
