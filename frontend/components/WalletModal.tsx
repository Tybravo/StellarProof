"use client";

import { useState, useRef, useEffect } from "react";
import {
  ExternalLink,
  Loader2,
  ChevronDown,
  Wallet,
  UserCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { FREIGHTER_INSTALL_URL } from "@/services/wallet";
import { motion, AnimatePresence } from "framer-motion";
import { AccountDropdown } from "@/components/wallet/AccountDropdown";

const btnBase =
  "rounded-lg px-4 py-2.5 text-sm font-semibold w-full sm:w-auto flex justify-center items-center gap-2 transition focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-darkblue cursor-pointer disabled:opacity-70";

function FreighterNotInstalledModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="freighter-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-darkblue/95 p-6 shadow-2xl backdrop-blur-md"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 text-amber-400" aria-hidden="true" />
          </div>

          <div>
            <h2
              id="freighter-modal-title"
              className="text-lg font-semibold text-white"
            >
              Freighter Not Installed
            </h2>
            <p className="mt-2 text-sm text-white/70">
              To connect your Stellar wallet, you need the Freighter browser
              extension. It's free and takes less than a minute to set up.
            </p>
          </div>

          <a
            href={FREIGHTER_INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow transition hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            onClick={onClose}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Install Freighter
          </a>

          <button
            type="button"
            onClick={onClose}
            className="text-sm text-white/50 transition hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function WalletModal() {
  const {
    publicKey,
    isConnected,
    isConnecting,
    connectError,
    isFreighterInstalled,
    connect,
    clearError,
  } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotInstalledModal, setShowNotInstalledModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show not-installed modal if connect was attempted and Freighter is missing
  useEffect(() => {
    if (
      connectError &&
      connectError.toLowerCase().includes("not installed")
    ) {
      setShowNotInstalledModal(true);
      clearError();
    }
  }, [connectError, clearError]);

  if (isConnected && publicKey) {
    return <AccountDropdown />;
  }

  const handleConnectClick = () => {
    // If we already know Freighter is not installed, show modal immediately
    if (isFreighterInstalled === false) {
      setShowNotInstalledModal(true);
      setIsOpen(false);
      return;
    }
    connect();
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isConnecting}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-controls="wallet-menu"
          aria-label={isConnecting ? "Connecting wallet" : "Launch App, open wallet menu"}
          className={`${btnBase} bg-primary text-white shadow-button-glow hover:shadow-glow`}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Connecting…
            </>
          ) : (
            <>
              Launch App
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </>
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="wallet-menu"
              role="menu"
              aria-label="Wallet options"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-darkblue/95 p-1 shadow-lg backdrop-blur-md z-50"
            >
              <a
                role="menuitem"
                href="/launch"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset"
                onClick={() => setIsOpen(false)}
              >
                <UserCircle className="h-4 w-4" aria-hidden="true" />
                Access Account
              </a>
              <button
                role="menuitem"
                onClick={handleConnectClick}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset"
              >
                <Wallet className="h-4 w-4" aria-hidden="true" />
                Connect Wallet
              </button>
              <a
                role="menuitem"
                href={FREIGHTER_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-inset"
                onClick={() => setIsOpen(false)}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Install Freighter
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {connectError && !connectError.toLowerCase().includes("not installed") && (
          <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] z-40">
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 backdrop-blur-md"
            >
              <span className="text-xs text-red-300">{connectError}</span>
              <button
                type="button"
                onClick={clearError}
                aria-label="Dismiss wallet error"
                className="text-red-300 hover:text-white text-xs font-medium shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNotInstalledModal && (
          <FreighterNotInstalledModal
            onClose={() => setShowNotInstalledModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}