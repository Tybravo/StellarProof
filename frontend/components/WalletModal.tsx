"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, LogOut, ExternalLink, Loader2, ChevronDown, Wallet } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { FREIGHTER_INSTALL_URL } from "@/services/wallet";
import { motion, AnimatePresence } from "framer-motion";

const btnBase =
  "rounded-lg px-4 py-2.5 text-sm font-semibold w-full sm:w-auto flex justify-center items-center gap-2 transition focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-darkblue cursor-pointer disabled:opacity-70";

export function WalletModal() {
  const {
    publicKey,
    isConnected,
    isFreighterInstalled,
    isConnecting,
    connectError,
    connect,
    disconnect,
    clearError,
  } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shortenAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  const handleCopy = () => {
    if (publicKey) navigator.clipboard.writeText(publicKey);
    setIsOpen(false);
  };

  if (isConnected && publicKey) {
    return (
      <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${btnBase} rounded-full border border-white/20 bg-white/5 py-2 pl-4 pr-3 font-medium text-white shadow-header backdrop-blur-md hover:bg-white/10 hover:shadow-glow`}
        >
          <div className="h-2 w-2 rounded-full bg-green-400" />
          {shortenAddress(publicKey)}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-darkblue/95 p-1 shadow-lg backdrop-blur-md z-50"
            >
              <button
                onClick={handleCopy}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Copy Address
              </button>
              <button
                onClick={() => {
                  disconnect();
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary transition hover:bg-white/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isConnecting}
        className={`${btnBase} bg-primary text-white shadow-button-glow hover:shadow-glow`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting…
          </>
        ) : (
          <>
            Launch App
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-darkblue/95 p-1 shadow-lg backdrop-blur-md z-50"
          >
            <button
              onClick={() => {
                connect();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
            <a
              href={FREIGHTER_INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 hover:text-white cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <ExternalLink className="h-4 w-4" />
              Install Freighter
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {connectError && (
        <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] z-40">
          <div className="flex items-center justify-between gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 backdrop-blur-md">
            <span className="text-xs text-red-300">{connectError}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-red-300 hover:text-white text-xs font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
