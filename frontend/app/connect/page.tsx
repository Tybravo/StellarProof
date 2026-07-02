"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/context/ToastContext";
import { Wallet, Loader2, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import Header from "@/components/Header";

export default function ConnectPage() {
  const router = useRouter();
  const { isConnected, isConnecting, connectError, connect, clearError } = useWallet();
  const { addToast } = useToast();

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (isConnected) {
      router.push("/wallet");
    }
  }, [isConnected, router]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err: unknown) {
      addToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to connect wallet",
      });
    }
  };

  // Trigger toast on connect error from context
  useEffect(() => {
    if (connectError) {
      addToast({
        type: "error",
        message: connectError,
      });
      clearError();
    }
  }, [connectError, addToast, clearError]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkblue-dark flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-3xl border border-gray-200 dark:border-white/10 p-8 shadow-2xl relative overflow-hidden group">
          {/* Decorative Glow Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-125" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-125" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Wallet Icon with Pulse Glow */}
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-button-glow relative">
              <Wallet className="w-10 h-10 text-primary animate-pulse" aria-hidden />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
              Connect Web3 Wallet
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
              Connect your Freighter wallet to access your dedicated StellarProof Wallet Dashboard, view balances, track transaction history, and interact with Soroban smart contracts.
            </p>

            {/* Main Action Button */}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`w-full py-3.5 px-5 rounded-2xl bg-primary text-white font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 shadow-button-glow hover:bg-primary-light hover:shadow-glow disabled:opacity-75 disabled:cursor-not-allowed`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting to Freighter...
                </>
              ) : (
                <>
                  Connect Freighter Wallet
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Helper Links */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 w-full flex flex-col gap-3.5 text-xs text-left">
              <div className="flex items-start gap-2.5 text-gray-600 dark:text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Secure Connection:</strong> Your keys never leave your browser. Freighter secures your credentials locally.
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-gray-600 dark:text-gray-400">
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Don&apos;t have Freighter?{" "}
                  <a
                    href="https://www.freighter.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Install Extension
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
