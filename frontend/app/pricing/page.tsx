"use client";

import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/app/context/AuthContext";
import { Check, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PricingTier {
  name: string;
  monthlyUSD: number;
  monthlyXLM: number;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: "Free",
    monthlyUSD: 0,
    monthlyXLM: 0,
    description: "Get started with basic verification features",
    features: [
      "3 monthly verifications",
      "Basic certificates",
      "Email support",
      "Stellar network (testnet)"
    ],
    cta: "Get Started"
  },
  {
    name: "Personal",
    monthlyUSD: 9,
    monthlyXLM: 50,
    description: "Perfect for individual creators",
    features: [
      "Unlimited verifications",
      "Advanced certificates",
      "Priority email support",
      "Stellar network (mainnet)",
      "Custom branding"
    ],
    cta: "Get Started",
    popular: true
  },
  {
    name: "Business",
    monthlyUSD: 29,
    monthlyXLM: 150,
    description: "For growing businesses and teams",
    features: [
      "Everything in Personal",
      "Team workspace",
      "API access",
      "Analytics dashboard",
      "Dedicated account manager"
    ],
    cta: "Get Started"
  },
  {
    name: "Enterprise",
    monthlyUSD: 99,
    monthlyXLM: 500,
    description: "For large organizations with custom needs",
    features: [
      "Everything in Business",
      "Custom integration",
      "Onboarding & training",
      "Custom SLA",
      "Whitelabel solution"
    ],
    cta: "Contact Sales"
  }
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const [currency, setCurrency] = useState<"USD" | "XLM">("USD");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPreference, setSelectedPreference] = useState<string | null>(null);

  const handleCurrencyChange = (newCurrency: "USD" | "XLM") => {
    setCurrency(newCurrency);
    setIsDropdownOpen(false);
  };

  const handlePreferenceSave = () => {
    if (isAuthenticated && selectedPreference) {
      alert(`Saved pricing preference: ${selectedPreference}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />
      <main id="main-content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include our core verification technology.
          </p>

          {/* Pricing Preference Section */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white dark:bg-darkblue p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm max-w-xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pricing Preference:
              </span>
              {/* Custom Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={!isAuthenticated}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isAuthenticated
                      ? "border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary cursor-pointer"
                      : "border-gray-200 dark:border-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {selectedPreference || "Select plan"}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-2 w-48 bg-white dark:bg-darkblue rounded-xl border border-gray-200 dark:border-white/10 shadow-lg overflow-hidden"
                    >
                      {pricingTiers.map((tier) => (
                        <button
                          key={tier.name}
                          onClick={() => setSelectedPreference(tier.name)}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                            selectedPreference === tier.name
                              ? "bg-primary/10 text-primary"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                          }`}
                        >
                          {tier.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <button
              onClick={handlePreferenceSave}
              disabled={!isAuthenticated || !selectedPreference}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isAuthenticated && selectedPreference
                  ? "bg-primary text-white hover:bg-primary-dark shadow-button-glow"
                  : "bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed"
              }`}
            >
              Save Preference
            </button>
          </div>

          {/* Currency Switcher */}
          <div className="mt-6 inline-flex items-center gap-3 bg-white dark:bg-darkblue p-1 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
            {(["USD", "XLM"] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  currency === curr
                    ? "bg-primary text-white shadow-button-glow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Log in
              </Link>{" "}
              to save your pricing preference.
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pricingTiers.map((tier, index) => (
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
                  {currency === "USD" ? (
                    <>
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        ${tier.monthlyUSD}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {tier.monthlyXLM} XLM
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>
                    </>
                  )}
                </div>
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
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-10">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I switch plans?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected on your next billing cycle."
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team."
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept credit cards, Stellar (XLM), and other major cryptocurrencies. Enterprise plans have additional billing options."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-darkblue rounded-2xl border border-gray-200 dark:border-white/10 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {faq.q}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
