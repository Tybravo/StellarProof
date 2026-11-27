"use client";

import { useMemo } from "react";
import { useWallet as useWalletContext } from "@/context/WalletContext";
import { FREIGHTER_INSTALL_URL } from "@/services/wallet";

export type WalletStatus =
  | "checking"
  | "not-installed"
  | "disconnected"
  | "connecting"
  | "connected";

/**
 * Reusable Freighter wallet hook.
 *
 * Wraps the shared WalletContext (so every consumer sees the same connection
 * state) and adds a single derived `status` plus convenience flags for
 * detection, connection and error handling. Must be used under WalletProvider.
 */
export function useWallet() {
  const wallet = useWalletContext();
  const { isConnected, isConnecting, isFreighterInstalled, publicKey } = wallet;

  const status: WalletStatus = useMemo(() => {
    if (isConnected && publicKey) return "connected";
    if (isConnecting) return "connecting";
    if (isFreighterInstalled === null) return "checking";
    if (isFreighterInstalled === false) return "not-installed";
    return "disconnected";
  }, [isConnected, isConnecting, isFreighterInstalled, publicKey]);

  return {
    ...wallet,
    status,
    isChecking: status === "checking",
    isInstalled: isFreighterInstalled === true,
    installUrl: FREIGHTER_INSTALL_URL,
  };
}

export type UseWalletReturn = ReturnType<typeof useWallet>;
