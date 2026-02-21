"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { isConnected as checkIsConnected, requestAccess } from "@stellar/freighter-api";

interface WalletState {
    publicKey: string | null;
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    signTx: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Check localStorage on mount
        const savedKey = localStorage.getItem("freighter_public_key");
        if (savedKey) {
            // Silently verify if still connected
            checkIsConnected().then((connected) => {
                if (connected) {
                    setPublicKey(savedKey);
                    setIsConnected(true);
                } else {
                    localStorage.removeItem("freighter_public_key");
                }
            });
        }
    }, []);

    const connect = useCallback(async () => {
        try {
            const installed = await checkIsConnected();
            if (!installed) {
                alert("Freighter is not installed. Please download the extension.");
                return;
            }

            const { address, error } = await requestAccess();
            if (error) {
                throw new Error(error);
            }
            if (address) {
                setPublicKey(address);
                setIsConnected(true);
                localStorage.setItem("freighter_public_key", address);
            }
        } catch (err: any) {
            console.error(err);
            if (err?.message?.includes("User declined")) {
                alert("Connection request was rejected by the user.");
            } else {
                alert("An error occurred while connecting to Freighter.");
            }
        }
    }, []);

    const disconnect = useCallback(() => {
        setPublicKey(null);
        setIsConnected(false);
        localStorage.removeItem("freighter_public_key");
    }, []);

    const signTx = useCallback(async (xdr: string): Promise<string> => {
        // Placeholder for future Soroban interactions
        console.log("signTx called with", xdr);
        return "";
    }, []);

    return (
        <WalletContext.Provider value={{ publicKey, isConnected: isMounted && isConnected, connect, disconnect, signTx }}>
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
