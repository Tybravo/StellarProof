"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export type Currency = "USD" | "XLM";

export type BillingPeriod = "monthly" | "yearly";

export interface PricingTier {
  name: string;
  monthlyUSD: number;
  monthlyXLM: number;
  /** Yearly price: ten months' worth, i.e. two months free. */
  yearlyUSD: number;
  yearlyXLM: number;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

interface PricingCardsProps {
  tiers: PricingTier[];
  currency: Currency;
  billingPeriod: BillingPeriod;
}

/** Renders an amount in the selected currency, e.g. "$9" or "50 XLM". */
export function formatPrice(amount: number, currency: Currency): string {
  return currency === "USD" ? `$${amount}` : `${amount} XLM`;
}

/** The amount a tier costs for one billing period in the selected currency. */
export function priceFor(
  tier: PricingTier,
  currency: Currency,
  billingPeriod: BillingPeriod
): number {
  if (billingPeriod === "yearly") {
    return currency === "USD" ? tier.yearlyUSD : tier.yearlyXLM;
  }
  return currency === "USD" ? tier.monthlyUSD : tier.monthlyXLM;
}

/** The "/month" or "/year" suffix shown next to a price. */
export function periodSuffix(billingPeriod: BillingPeriod): string {
  return billingPeriod === "yearly" ? "/year" : "/month";
}

/**
 * What a visitor keeps by paying yearly instead of twelve times monthly,
 * together with the number of months the yearly price covers for free.
 */
function yearlySaving(tier: PricingTier, currency: Currency) {
  const monthly = priceFor(tier, currency, "monthly");
  const yearly = priceFor(tier, currency, "yearly");
  const amount = monthly * 12 - yearly;
  const freeMonths = monthly > 0 ? 12 - yearly / monthly : 0;

  return { amount, freeMonths };
}

export default function PricingCards({
  tiers,
  currency,
  billingPeriod,
}: PricingCardsProps) {
  const isYearly = billingPeriod === "yearly";

  return (
    <div
      data-testid="pricing-cards"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
    >
      {tiers.map((tier, index) => {
        const { amount: saving, freeMonths } = yearlySaving(tier, currency);
        // The Free tier costs nothing either way, so there is nothing to save.
        const showSaving = isYearly && saving > 0;

        return (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative rounded-2xl border bg-white dark:bg-darkblue p-6 shadow-sm hover:shadow-md transition-all ${
              tier.popular
                ? "border-primary/50 ring-2 ring-primary/20"
                : "border-gray-200 dark:border-white/10"
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                  Most Popular
                </span>
              </div>
            )}

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {tier.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {tier.description}
            </p>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(priceFor(tier, currency, billingPeriod), currency)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {periodSuffix(billingPeriod)}
                </span>
              </div>

              {showSaving && (
                <span className="mt-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {freeMonths === 2
                    ? `Save ${formatPrice(saving, currency)} — two months free`
                    : `Save ${formatPrice(saving, currency)} a year`}
                </span>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={tier.name === "Enterprise" ? "/contact" : "/verify"}
              className={`block w-full text-center px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                tier.popular
                  ? "bg-primary text-white hover:bg-primary-dark shadow-button-glow"
                  : "border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary"
              }`}
            >
              {tier.cta}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
