"use client";

/**
 * Orchestrates the fiat checkout: asks the server for a PaymentIntent, mounts
 * the Stripe `<Elements>` provider around `<FiatPaymentForm>`, and renders the
 * loading / configuration / error / success states.
 *
 * It renders the form `<section>` and the summary `<aside>` as siblings so the
 * page keeps its original two-column `lg:grid-cols-[1fr_420px]` layout.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, TriangleAlert } from "lucide-react";

import { UI_MESSAGES } from "@/lib/checkout/messages";
import {
  CHECKOUT_CURRENCY,
  DEFAULT_BILLING_PERIOD,
  DEFAULT_PLAN_ID,
  formatAmount,
  getCheckoutPlan,
  resolvePlanAmount,
  type BillingPeriod,
} from "@/lib/checkout/plans";

import FiatPaymentForm from "./FiatPaymentForm";
import OrderSummary from "./OrderSummary";
import { getStripePromise, getStripePublishableKey } from "./stripe-client";
import { extractApiError, parsePaymentSession, type PaymentSession, type VerifiedPayment } from "./types";

export interface FiatCheckoutProps {
  /** Plan to charge for. Must exist in the server-held catalogue. */
  planId?: string;
  /** Billing period to charge for. */
  billingPeriod?: BillingPeriod;
}

export default function FiatCheckout({
  planId = DEFAULT_PLAN_ID,
  billingPeriod = DEFAULT_BILLING_PERIOD,
}: FiatCheckoutProps) {
  const publishableKey = getStripePublishableKey();
  const stripePromise = useMemo(() => getStripePromise(), []);

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [payment, setPayment] = useState<VerifiedPayment | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isDark, setIsDark] = useState(false);

  // Keep the Stripe Elements theme in step with the app's `.dark` class.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!publishableKey) return;

    let cancelled = false;
    const controller = new AbortController();

    async function createSession() {
      try {
        const response = await fetch("/api/checkout/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Only an identifier is sent - the amount is server-side authority.
          body: JSON.stringify({ planId, billingPeriod }),
          signal: controller.signal,
        });

        const body: unknown = await response.json().catch(() => null);
        if (cancelled) return;

        if (!response.ok) {
          setInitError(extractApiError(body) ?? UI_MESSAGES.INIT_FAILED);
          return;
        }

        const parsed = parsePaymentSession(body);
        if (!parsed) {
          setInitError(UI_MESSAGES.INIT_FAILED);
          return;
        }

        setInitError(null);
        setSession(parsed);
      } catch {
        if (!cancelled) setInitError(UI_MESSAGES.NETWORK_FAILED);
      }
    }

    void createSession();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [publishableKey, planId, billingPeriod, attempt]);

  const retry = useCallback(() => {
    setInitError(null);
    setSession(null);
    setAttempt((value) => value + 1);
  }, []);

  const appearance = useMemo<Appearance>(
    () => ({
      theme: isDark ? "night" : "stripe",
      variables: { colorPrimary: "#256af4", borderRadius: "12px" },
    }),
    [isDark],
  );

  const elementsOptions = useMemo<StripeElementsOptions | null>(
    () => (session ? { clientSecret: session.clientSecret, appearance } : null),
    [session, appearance],
  );

  // Display-only fallback so the summary is populated before the server replies.
  const catalogPlan = getCheckoutPlan(planId);
  const displayPlanName = session?.planName ?? catalogPlan?.name ?? planId;
  const displayAmount =
    session?.amount ?? (catalogPlan ? resolvePlanAmount(catalogPlan, billingPeriod) : 0);
  const displayCurrency = session?.currency ?? CHECKOUT_CURRENCY;

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#08111f]">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">Secure checkout</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pay with credit card
            </h1>
          </div>
        </div>

        {!publishableKey ? (
          <div
            data-testid="stripe-unavailable"
            role="status"
            className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <span>
              <strong className="block font-semibold">{UI_MESSAGES.UNAVAILABLE_TITLE}</strong>
              {UI_MESSAGES.UNAVAILABLE_BODY}
            </span>
          </div>
        ) : payment ? (
          <div
            data-testid="payment-success"
            role="status"
            className="rounded-2xl bg-green-50 p-6 text-green-800 dark:bg-green-900/20 dark:text-green-200"
          >
            <p className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden />
              {UI_MESSAGES.SUCCESS_TITLE}
            </p>
            <p className="mt-2 text-sm">
              We received your{" "}
              {formatAmount(payment.amount ?? displayAmount, payment.currency ?? displayCurrency)}{" "}
              payment for the {payment.planName ?? displayPlanName} plan. Stripe has emailed your
              receipt.
            </p>
            {payment.paymentIntentId ? (
              <p className="mt-2 text-xs text-green-700 dark:text-green-300">
                Reference: <span data-testid="payment-reference">{payment.paymentIntentId}</span>
              </p>
            ) : null}
          </div>
        ) : initError ? (
          <div className="space-y-4">
            <p
              role="alert"
              data-testid="payment-error"
              className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              {initError}
            </p>
            <button
              type="button"
              data-testid="retry-payment-intent"
              onClick={retry}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5"
            >
              {UI_MESSAGES.RETRY}
            </button>
          </div>
        ) : !session || !elementsOptions || !stripePromise ? (
          <p
            data-testid="payment-loading"
            role="status"
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {UI_MESSAGES.LOADING}
          </p>
        ) : (
          <Elements stripe={stripePromise} options={elementsOptions}>
            <FiatPaymentForm
              clientSecret={session.clientSecret}
              amount={session.amount}
              currency={session.currency}
              onPaymentVerified={setPayment}
            />
          </Elements>
        )}
      </section>

      <OrderSummary
        planName={displayPlanName}
        amount={displayAmount}
        currency={displayCurrency}
        pending={Boolean(publishableKey) && !session && !initError && !payment}
      />
    </>
  );
}
