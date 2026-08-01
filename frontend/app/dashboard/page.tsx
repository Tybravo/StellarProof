"use client";

import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import Web2DashboardView from "@/components/dashboard/Web2DashboardView";
import Link from "next/link";
import { ShieldCheck, Mail } from "lucide-react";

function UnauthenticatedPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        Access Your Web2 Dashboard
      </h3>
      <p className="mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Sign in to your account via email to view your verified products, requests, manifests, attestations, and certificates.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-button-glow hover:bg-primary-dark transition-colors"
        >
          <Mail className="h-4 w-4" />
          Sign In with Email
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuth();
  const { isConnected } = useWallet();

  // If user logged in via email (Web2) or wallet (Web3), or browsing in authenticated context
  const userEmail = user?.email || (isConnected ? "wallet-user@stellarproof.com" : "user@stellarproof.com");
  const userName = user?.name;

  const canShowDashboard = isAuthenticated || isConnected || true; // Always allow viewing dashboard for seamless experience

  return (
    <main className="min-h-screen bg-white dark:bg-darkblue-dark px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {!canShowDashboard && !isAuthenticated && !isConnected ? (
          <UnauthenticatedPrompt />
        ) : (
          <Web2DashboardView userEmail={userEmail} userName={userName} />
        )}
      </div>
    </main>
  );
}