"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, LogOut, ExternalLink, ChevronDown } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { clsx } from "clsx";

/**
 * AccountDropdown Component
 *
 * A professional wallet account management dropdown that provides quick access
 * to wallet details and actions like copying address, viewing on explorer,
 * and disconnecting.
 */
export function AccountDropdown() {
  const { publicKey, disconnect } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Truncate address for display (e.g., GABC...WXYZ)
  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // Handle copying the full address to clipboard
  const handleCopy = useCallback(async () => {
    if (publicKey) {
      try {
        await navigator.clipboard.writeText(publicKey);
        setCopied(true);
        // Reset "copied" state after 2 seconds for visual confirmation
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
      }
    }
  }, [publicKey]);

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const closeDropdown = useCallback(() => setIsOpen(false), []);

  // Handle outside clicks and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDropdown();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, closeDropdown]);

  if (!publicKey) return null;

  const explorerUrl = `https://stellar.expert/explorer/public/account/${publicKey}`;

  return (
    <div
      className="relative inline-block w-full text-left sm:w-auto"
      ref={dropdownRef}
    >
      {/* Trigger Button */}
      <button
        onClick={toggleDropdown}
        className={clsx(
          "flex w-full items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-secondary/50 sm:w-auto sm:justify-start",
          isOpen && "ring-2 ring-secondary/50 bg-white/20",
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
        <span className="font-mono tracking-wide">
          {shortenAddress(publicKey)}
        </span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 text-white/70 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 z-50 mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-darkblue/95 p-1.5 shadow-2xl backdrop-blur-xl focus:outline-none"
          >
            {/* Header / Address Info */}
            <div className="px-3 py-3 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Connected Wallet
              </p>
              <p className="mt-1 truncate font-mono text-xs text-white/90">
                {publicKey}
              </p>
            </div>

            {/* Actions Group */}
            <div className="space-y-1 border-t border-white/5 pt-1.5">
              <button
                onClick={handleCopy}
                className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-white/60 group-hover:text-white" />
                  )}
                  <span>{copied ? "Copied to clipboard" : "Copy Address"}</span>
                </div>
                {!copied && (
                  <span className="text-[10px] text-white/20 group-hover:text-white/40">
                    ⌘C
                  </span>
                )}
              </button>

              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                onClick={closeDropdown}
              >
                <ExternalLink className="h-4 w-4 text-white/60 group-hover:text-white" />
                <span>View on Explorer</span>
              </a>
            </div>

            {/* Disconnect Action */}
            <div className="mt-1.5 border-t border-white/5 pt-1.5">
              <button
                onClick={() => {
                  disconnect();
                  closeDropdown();
                }}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4 text-secondary group-hover:text-red-400" />
                <span>Disconnect Wallet</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
