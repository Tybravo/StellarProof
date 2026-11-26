"use client";

/**
 * Order summary column. Amounts come from the server-created PaymentIntent once
 * it exists; before that they fall back to the shared plan catalogue purely for
 * display. The browser never sends an amount anywhere.
 */

import { ShieldCheck } from "lucide-react";

import { formatAmount } from "@/lib/checkout/plans";

export interface OrderSummaryProps {
  planName: string;
  /** Amount in minor currency units (e.g. 900 = $9.00). */
  amount: number;
  currency: string;
  /** `true` while the authoritative amount is still being fetched. */
  pending?: boolean;
}

export default function OrderSummary({
  planName,
  amount,
  currency,
  pending = false,
}: OrderSummaryProps) {
  const total = formatAmount(amount, currency);

  return (
    <aside
      data-testid="order-summary"
      aria-busy={pending}
      className="h-fit rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#08111f]"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order summary</h2>
      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">{planName} plan</span>
          <span data-testid="plan-amount" className="font-medium text-gray-900 dark:text-white">
            {total}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Processing fee</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatAmount(0, currency)}
          </span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-4 text-base dark:border-white/10">
          <span className="font-semibold text-gray-900 dark:text-white">Total</span>
          <span data-testid="payment-total" className="font-bold text-primary">
            {total}
          </span>
        </div>
      </div>
      <p className="mt-6 flex items-start gap-2 rounded-2xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        Card details are entered directly into Stripe&apos;s PCI-compliant payment form. StellarProof
        never sees or stores your card number.
      </p>
    </aside>
  );
}
