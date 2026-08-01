"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { walletService, type NetworkDetails } from "@/services/wallet";

const STORAGE_KEY = "freighter_public_key";
const NETWORK_POLL_INTERVAL_MS = 4000;

interface WalletState {
  publicKey: string | null;
  isConnected: boolean;
  isFreighterInstalled: boolean | null;
  isConnecting: boolean;
  connectError: string | null;
  networkDetails: NetworkDetails | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTx: (xdr: string) => Promise<string>;
  clearError: () => void;
  refreshNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [networkDetails, setNetworkDetails] = useState<NetworkDetails | null>(null);

  if (!mounted) {
    setMounted(true);
  }

  const refreshNetwork = useCallback(async () => {
    try {
      const details = await walletService.getNetworkDetails();
      setNetworkDetails(details);
    } catch {
      setNetworkDetails(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    walletService.isInstalled().then((installed) => {
      if (!cancelled) setIsFreighterInstalled(installed);
    });
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

  useEffect(() => {
    if (!mounted || !isConnected) return;
    let cancelled = false;

    walletService.getNetworkDetails()
      .then((details) => { if (!cancelled) setNetworkDetails(details); })
      .catch(() => { if (!cancelled) setNetworkDetails(null); });

    const interval = setInterval(() => {
      walletService.getNetworkDetails()
        .then((details) => setNetworkDetails(details))
        .catch(() => setNetworkDetails(null));
    }, NETWORK_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mounted, isConnected]);

  const clearError = useCallback(() => setConnectError(null), []);

  const connect = useCallback(async () => {
    setConnectError(null);
    setIsConnecting(true);

    try {
      const installed = await walletService.isInstalled();
      if (!installed) {
        setConnectError("Freighter is not installed. Please install the extension and try again.");
        return;
      }

      const result = await walletService.requestAccess();
      if (result.error || !result.address) {
        throw new Error(result.error ?? "Unable to connect to Freighter.");
      }

      const address = result.address;
      setPublicKey(address);
      setIsConnected(true);
      setConnectError(null);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, address);
        localStorage.setItem("walletConnected", "true");
      }

      const details = await walletService.getNetworkDetails();
      setNetworkDetails(details);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect.";
      setPublicKey(null);
      setIsConnected(false);
      setConnectError(message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setIsConnected(false);
    setConnectError(null);
    setNetworkDetails(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("walletConnected");
    }
  }, []);

  const signTx = useCallback(async (xdr: string): Promise<string> => {
    void xdr;
    return "";
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (!mounted) return;
    
    const isStoredConnected = typeof window !== "undefined" ? localStorage.getItem("walletConnected") === "true" : false;
    if (!isStoredConnected) return;

    // Check if installed before trying to auto-connect
    walletService.isInstalled().then((installed) => {
      if (installed) {
         walletService.getAddress().then((address) => {
            if (address) {
              setPublicKey(address);
              setIsConnected(true);
            } else {
               // If we can't get address despite stored connection, clear storage
               disconnect();
            }
         }).catch(() => disconnect());
      }
    });
  }, [mounted, disconnect]);

  const value: WalletState = {
    publicKey,
    isConnected: mounted && isConnected,
    isFreighterInstalled,
    isConnecting,
    connectError,
    networkDetails,
    connect,
    disconnect,
    signTx,
    clearError,
    refreshNetwork,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
