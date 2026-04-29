"use client";

import React, { useState, useCallback } from "react";
import {
  Shield,
  ExternalLink,
  Copy,
  Check,
  UserCheck,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type OracleProvider } from "../../services/registry";
import { cn } from "../../utils/cn";

interface ProviderListProps {
  providers: OracleProvider[];
  isLoading?: boolean;
}

/**
 * Truncates a Stellar address for display.
 */
function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/**
 * Copy Button Component
 */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors"
      title="Copy Address"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

export function ProviderList({ providers, isLoading }: ProviderListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-3xl border-2 border-dashed border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
          <Info className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          No Providers Found
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No authorized oracle providers are currently registered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <AnimatePresence mode="popLayout">
          {providers.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="group relative flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 hover:border-primary/50 dark:hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
            >
              <div className="flex items-center gap-4">
                {/* Identity Icon/Badge */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {provider.name}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tight bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                      <Shield className="w-2.5 h-2.5" />
                      Authorized
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {truncateAddress(provider.address)}
                    <CopyButton value={provider.address} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://stellar.expert/explorer/${provider.network === "Mainnet" ? "public" : "testnet"}/account/${provider.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-primary transition-colors bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-lg group/link"
                >
                  Explorer
                  <ArrowUpRight className="w-3 h-3 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
