"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, LogOut } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { motion, AnimatePresence } from "framer-motion";

export function WalletModal() {
    const { publicKey, isConnected, connect, disconnect } = useWallet();
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

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    const handleCopy = () => {
        if (publicKey) {
            navigator.clipboard.writeText(publicKey);
        }
        setIsOpen(false);
    };

    if (!isConnected || !publicKey) {
        return (
            <button
                onClick={connect}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow transition hover:shadow-glow focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-darkblue w-full sm:w-auto cursor-pointer flex justify-center items-center"
            >
                Connect Wallet
            </button>
        );
    }

    return (
        <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full justify-center sm:justify-start items-center gap-2 rounded-full border border-white/20 bg-white/5 py-2 pl-4 pr-3 text-sm font-medium text-white shadow-header backdrop-blur-md transition hover:bg-white/10 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary cursor-pointer"
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
                        className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-darkblue/95 p-1 shadow-lg backdrop-blur-md"
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
