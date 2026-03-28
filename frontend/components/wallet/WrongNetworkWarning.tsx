"use client";

import { useWallet } from "@/context/WalletContext";
import { getExpectedNetwork, isNetworkBypassEnabled } from "@/config/network";
import type { StellarNetworkId } from "@/services/wallet";

const NETWORK_LABELS: Record<Exclude<StellarNetworkId, "unknown">, string> = {
  mainnet: "Mainnet",
  testnet: "Testnet",
  futurenet: "Futurenet",
};

function networkLabel(network: StellarNetworkId): string {
  return network === "unknown" ? "Unknown" : NETWORK_LABELS[network] ?? network;
}

export default function WrongNetworkWarning() {
  const { isConnected, networkDetails } = useWallet();
  const expected = getExpectedNetwork();
  const bypass = isNetworkBypassEnabled();

  if (!isConnected || bypass || !networkDetails) return null;
  const current = networkDetails.network;
  if (current === expected || current === "unknown") return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 w-full border-b border-amber-500/50 bg-amber-500/15 px-4 py-2 text-center text-sm font-medium text-amber-800 dark:bg-amber-200/90 dark:text-amber-950"
    >
      <span>
        Wrong network: wallet is on <strong>{networkLabel(current)}</strong>. This app expects{" "}
        <strong>{networkLabel(expected)}</strong>. Switch network in Freighter to continue.
      </span>
    </div>
  );
}
