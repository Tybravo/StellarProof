"use client";

/**
 * Billing Dashboard (Table View)
 *
 * Implements the billing history dashboard UI based on Figma designs,
 * fulfilling Issue #412:
 * - Displays billing subscription card (plan, price, renewal date, verifications usage).
 * - Displays billing history table with Date (issued & due), Amount, Plan / Line Item, and Status.
 * - Handles live/sample data fallback gracefully with accessibility compliance.
 */

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CreditCard, Receipt } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import InvoicesView from "./invoices";
import {
  fetchBillingInvoices,
  fetchSubscription,
  type BillingSource,
  type Invoice,
  type Subscription,
  type SubscriptionStatus,
} from "@/services/billingService";
import { invoiceTotal } from "@/services/billingMock";

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  active: "Active",
  trialing: "Trial",
  past_due: "Past due",
  canceled: "Canceled",
};

const SUBSCRIPTION_STYLE: Record<SubscriptionStatus, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800",
  trialing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  past_due:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
  canceled:
    "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10",
};

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

function SubscriptionCard({ subscription }: { subscription: Subscription }) {
  const usage =
    subscription.verificationsIncluded === null
      ? "Unlimited"
      : `${subscription.verificationsUsed} of ${subscription.verificationsIncluded}`;

  return (
    <section
      className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue p-6 shadow-sm"
      aria-labelledby="subscription-heading"
      data-testid="subscription-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 id="subscription-heading" className="text-lg font-bold text-gray-900 dark:text-white">
              {subscription.planName} plan
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatUsd(subscription.priceUsd)} per {subscription.interval}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${SUBSCRIPTION_STYLE[subscription.status]}`}
          data-testid="subscription-status"
        >
          {SUBSCRIPTION_LABEL[subscription.status]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label={subscription.cancelAtPeriodEnd ? "Access until" : "Renews on"}
          value={formatDate(subscription.currentPeriodEnd)}
          hint={subscription.cancelAtPeriodEnd ? "Auto-renewal is off" : undefined}
        />
        <SummaryTile label="Verifications used" value={usage} hint="This billing period" />
        <SummaryTile
          label="Next charge"
          value={subscription.cancelAtPeriodEnd ? "None" : formatUsd(subscription.priceUsd)}
          hint={subscription.cancelAtPeriodEnd ? "Plan ends this period" : "Billed automatically"}
        />
      </div>

      <Link
        href="/dashboard/settings/subscription"
        className="mt-5 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
      >
        Change plan
      </Link>
    </section>
  );
}

function SampleDataNotice() {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
      role="status"
      data-testid="sample-data-notice"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        The billing API is unavailable, so sample figures are shown. Reconnect to see your live
        subscription and invoices.
      </p>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const email = user?.email ?? "user@stellarproof.com";

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [source, setSource] = useState<BillingSource>("api");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    Promise.all([
      fetchSubscription({ email, signal: controller.signal }),
      fetchBillingInvoices({ email, signal: controller.signal }),
    ])
      .then(([subscriptionResult, invoicesResult]) => {
        if (cancelled) return;
        setSubscription(subscriptionResult.data);
        setInvoices(invoicesResult.data);
        // Only claim the data is live when both halves came from the API.
        setSource(
          subscriptionResult.source === "api" && invoicesResult.source === "api"
            ? "api"
            : "sample",
        );
        setError(null);
      })
      .catch((err) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        console.error("Failed to load billing data:", err);
        setError("We could not load your billing details. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [email, reloadToken]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setReloadToken((token) => token + 1);
  }, []);

  const outstanding = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);

  return (
    <main className="min-h-screen bg-white dark:bg-darkblue-dark px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your plan, usage and invoice history for {email}.
            </p>
          </div>
        </div>

        {!isLoading && !error && source === "sample" && <SampleDataNotice />}

        {isLoading ? (
          <div
            className="h-44 animate-pulse rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
            data-testid="subscription-skeleton"
          />
        ) : (
          subscription && <SubscriptionCard subscription={subscription} />
        )}

        {!isLoading && !error && outstanding > 0 && (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300" data-testid="outstanding-total">
            Outstanding balance: {formatUsd(outstanding)}
          </p>
        )}

        <h2 className="pt-2 text-lg font-bold text-gray-900 dark:text-white">Invoices</h2>

        <InvoicesView
          invoices={invoices}
          isLoading={isLoading}
          error={error}
          onRetry={handleRetry}
          showHeader={false}
        />
      </div>
    </main>
  );
}
