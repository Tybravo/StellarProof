"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { walletService } from "@/services/wallet";

const STORAGE_KEY = "freighter_public_key";

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  isFreighterInstalled: boolean | null;
  isConnecting: boolean;
  connectError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTx: (xdr: string) => Promise<string>;
  clearError: () => void;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    walletService.isInstalled().then((installed) => {
      if (!cancelled) setIsFreighterInstalled(installed);
    });
    setMounted(true);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!saved) return;
    walletService.getAddress().then((address) => {
      if (address && address === saved) {
        setPublicKey(saved);
        setIsConnected(true);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    });
  }, [mounted]);

  const clearError = useCallback(() => setConnectError(null), []);

  const connect = useCallback(async () => {
    setConnectError(null);
    const installed = await walletService.isInstalled();
    if (!installed) {
      setConnectError("Freighter is not installed.");
      return;
    }
    setIsConnecting(true);
    try {
      const result = await walletService.requestAccess();
      if (result.error) {
        setConnectError(
          result.error.toLowerCase().includes("declined") ? "Connection was declined." : result.error
        );
        return;
      }
      if (result.address) {
        setPublicKey(result.address);
        setIsConnected(true);
        setConnectError(null);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, result.address);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect.";
      setConnectError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setConnectError(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signTx = useCallback(async (_xdr: string): Promise<string> => {
    return "";
  }, []);

  const value: WalletState = {
    publicKey,
    isConnected: mounted && isConnected,
    isFreighterInstalled,
    isConnecting,
    connectError,
    connect,
    disconnect,
    signTx,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
