"use client";

import React from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

/** Identifier of a plan column in the comparison table. */
export type PricingTierId = "free" | "personal" | "business" | "enterprise";

export interface PricingTierColumn {
  id: PricingTierId;
  name: string;
  /** Short price label rendered under the tier name, e.g. "$9/mo". */
  price: string;
  /** Highlighted column (mirrors the "Most Popular" pricing card). */
  popular?: boolean;
  /** Call-to-action label for the closing row. */
  cta: string;
  href: string;
}

/**
 * A single cell value. `true` / `false` render an availability icon,
 * a string renders verbatim (e.g. "Unlimited", "Testnet", "Custom").
 */
export type PricingFeatureValue = boolean | string;

export interface PricingFeature {
  /** Feature label shown in the row header. */
  name: string;
  /** Optional clarification rendered under the feature name. */
  description?: string;
  /** Value per tier. Every tier must be present so the table stays square. */
  values: Record<PricingTierId, PricingFeatureValue>;
}

export interface PricingFeatureGroup {
  /** Section title, e.g. "Verification". */
  name: string;
  features: PricingFeature[];
}

export interface PricingTableProps {
  tiers?: PricingTierColumn[];
  groups?: PricingFeatureGroup[];
  className?: string;
}

/* ------------------------------------------------------------------ */
/*                               Data                                  */
/* ------------------------------------------------------------------ */

export const PRICING_TIER_COLUMNS: PricingTierColumn[] = [
  {
    id: "free",
    name: "Free",
    price: "$0/mo",
    cta: "Get Started",
    href: "/verify",
  },
  {
    id: "personal",
    name: "Personal",
    price: "$9/mo",
    popular: true,
    cta: "Get Started",
    href: "/verify",
  },
  {
    id: "business",
    name: "Business",
    price: "$29/mo",
    cta: "Get Started",
    href: "/verify",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99/mo",
    cta: "Contact Sales",
    href: "/contact",
  },
];

export const PRICING_FEATURE_GROUPS: PricingFeatureGroup[] = [
  {
    name: "Verification",
    features: [
      {
        name: "Monthly verifications",
        description: "Assets you can anchor on-chain each billing cycle",
        values: {
          free: "3",
          personal: "Unlimited",
          business: "Unlimited",
          enterprise: "Unlimited",
        },
      },
      {
        name: "Stellar network",
        values: {
          free: "Testnet",
          personal: "Mainnet",
          business: "Mainnet",
          enterprise: "Mainnet",
        },
      },
      {
        name: "Bulk verification",
        values: {
          free: false,
          personal: false,
          business: true,
          enterprise: true,
        },
      },
      {
        name: "Proof-of-ownership manifests",
        values: {
          free: true,
          personal: true,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    name: "Certificates",
    features: [
      {
        name: "Certificate templates",
        values: {
          free: "Basic",
          personal: "Advanced",
          business: "Advanced",
          enterprise: "Custom",
        },
      },
      {
        name: "Custom branding",
        values: {
          free: false,
          personal: true,
          business: true,
          enterprise: true,
        },
      },
      {
        name: "Whitelabel certificates",
        values: {
          free: false,
          personal: false,
          business: false,
          enterprise: true,
        },
      },
      {
        name: "PDF export",
        values: {
          free: true,
          personal: true,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    name: "Collaboration",
    features: [
      {
        name: "Team workspace",
        values: {
          free: false,
          personal: false,
          business: true,
          enterprise: true,
        },
      },
      {
        name: "Seats included",
        values: {
          free: "1",
          personal: "1",
          business: "10",
          enterprise: "Unlimited",
        },
      },
      {
        name: "Role-based access control",
        values: {
          free: false,
          personal: false,
          business: true,
          enterprise: true,
        },
      },
    ],
  },
  {
    name: "Developer",
    features: [
      {
        name: "API access",
        values: {
          free: false,
          personal: false,
          business: true,
          enterprise: true,
        },
      },
      {
        name: "Webhooks",
        values: {
          free: false,
          personal: false,
          business: true,
          enterprise: true,
        },
      },
      {
        name: "Analytics dashboard",
        values: {
          free: false,
          personal: false,
          business: true,
          enterprise: true,
        },
      },
      {
        name: "Custom integration",
        values: {
          free: false,
          personal: false,
          business: false,
          enterprise: true,
        },
      },
    ],
  },
  {
    name: "Support",
    features: [
      {
        name: "Support channel",
        values: {
          free: "Email",
          personal: "Priority email",
          business: "Priority email",
          enterprise: "Dedicated manager",
        },
      },
      {
        name: "Onboarding and training",
        values: {
          free: false,
          personal: false,
          business: false,
          enterprise: true,
        },
      },
      {
        name: "Custom SLA",
        values: {
          free: false,
          personal: false,
          business: false,
          enterprise: true,
        },
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*                             Helpers                                 */
/* ------------------------------------------------------------------ */

/**
 * Renders a single cell value: booleans become an availability icon paired
 * with a screen-reader label, strings are rendered as-is.
 */
function FeatureValue({ value }: { value: PricingFeatureValue }) {
  if (typeof value === "string") {
    return (
      <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
    );
  }

  return value ? (
    <>
      <Check
        className="mx-auto h-5 w-5 text-primary"
        aria-hidden="true"
        data-testid="feature-included"
      />
      <span className="sr-only">Included</span>
    </>
  ) : (
    <>
      <Minus
        className="mx-auto h-5 w-5 text-gray-300 dark:text-gray-600"
        aria-hidden="true"
        data-testid="feature-excluded"
      />
      <span className="sr-only">Not included</span>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*                           PricingTable                              */
/* ------------------------------------------------------------------ */

/**
 * Detailed feature comparison table for the pricing page.
 *
 * Each feature row maps a capability to every pricing tier so visitors can
 * compare plans without cross-referencing the individual pricing cards. The
 * table scrolls horizontally on narrow viewports while the feature column
 * stays pinned to the left edge.
 */
export default function PricingTable({
  tiers = PRICING_TIER_COLUMNS,
  groups = PRICING_FEATURE_GROUPS,
  className,
}: PricingTableProps) {
  return (
    <section
      aria-labelledby="pricing-comparison-heading"
      className={cn("mt-20", className)}
    >
      <div className="text-center mb-10">
        <h2
          id="pricing-comparison-heading"
          className="text-2xl font-bold text-gray-900 dark:text-white"
        >
          Compare plans in detail
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Every feature, side by side, so you can pick the right tier.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <caption className="sr-only">
            Feature comparison across the Free, Personal, Business and
            Enterprise plans
          </caption>

          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-white dark:bg-darkblue px-6 py-5 text-sm font-semibold text-gray-900 dark:text-white"
              >
                Features
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier.id}
                  scope="col"
                  className={cn(
                    "px-6 py-5 text-center align-bottom",
                    tier.popular && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {tier.name}
                  </span>
                  <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                    {tier.price}
                  </span>
                  {tier.popular && (
                    <span className="mt-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Most Popular
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {groups.map((group) => (
            <tbody key={group.name}>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <th
                  scope="colgroup"
                  colSpan={tiers.length + 1}
                  className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {group.name}
                </th>
              </tr>

              {group.features.map((feature) => (
                <tr
                  key={feature.name}
                  className="border-b border-gray-100 dark:border-white/5"
                >
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white dark:bg-darkblue px-6 py-4 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {feature.name}
                    {feature.description && (
                      <span className="mt-0.5 block text-xs font-normal text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </span>
                    )}
                  </th>
                  {tiers.map((tier) => (
                    <td
                      key={tier.id}
                      className={cn(
                        "px-6 py-4 text-center",
                        tier.popular && "bg-primary/5 dark:bg-primary/10"
                      )}
                    >
                      <FeatureValue value={feature.values[tier.id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}

          <tfoot>
            <tr className="border-t border-gray-200 dark:border-white/10">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white dark:bg-darkblue px-6 py-5 text-sm font-semibold text-gray-900 dark:text-white"
              >
                Get started
              </th>
              {tiers.map((tier) => (
                <td
                  key={tier.id}
                  className={cn(
                    "px-6 py-5 text-center",
                    tier.popular && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <Link
                    href={tier.href}
                    className={cn(
                      "inline-block rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                      tier.popular
                        ? "bg-primary text-white hover:bg-primary-dark shadow-button-glow"
                        : "border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary"
                    )}
                  >
                    <span className="sr-only">{tier.name}: </span>
                    {tier.cta}
                  </Link>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
