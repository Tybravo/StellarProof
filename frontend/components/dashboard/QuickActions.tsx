"use client";

import Link from "next/link";
import { ShieldCheck, Package } from "lucide-react";

export interface QuickActionsProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export default function QuickActions({ activeTab, onSelectTab }: QuickActionsProps) {
  const handleProductsClick = (e: React.MouseEvent) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab("products");
    }
  };

  const handleVerifyClick = (e: React.MouseEvent) => {
    if (onSelectTab) {
      e.preventDefault();
      onSelectTab("verify");
    }
  };

  const isProductsActive = activeTab === "products";
  const isVerifyActive = activeTab === "verify";

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Quick Actions
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Verify Authenticity */}
        <Link
          href="/verify"
          onClick={handleVerifyClick}
          className={`rounded-xl border p-6 shadow-sm hover:shadow-md transition-all text-left block ${
            isVerifyActive
              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary"
              : "border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Verify Authenticity
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Verify a digital asset or certificate.
              </p>
            </div>
          </div>
        </Link>

        {/* My Products */}
        <Link
          href="/product"
          onClick={handleProductsClick}
          className={`rounded-xl border p-6 shadow-sm hover:shadow-md transition-all text-left block ${
            isProductsActive
              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-2 ring-primary"
              : "border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                My Products
              </h3>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                View all your verified digital products.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}