"use client";

import { useWallet } from "@/context/WalletContext";
import type { StellarNetworkId } from "@/services/wallet";

const NETWORK_LABELS: Record<Exclude<StellarNetworkId, "unknown">, string> = {
  mainnet: "Mainnet",
  testnet: "Testnet",
  futurenet: "Futurenet",
};

function BadgeLabel({ network }: { network: StellarNetworkId }) {
  const label = network === "unknown" ? "Unknown" : NETWORK_LABELS[network];
  const isTestnet = network === "testnet";
  const isMainnet = network === "mainnet";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium tabular-nums ${
        isMainnet
          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : isTestnet
            ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
            : "bg-gray-500/20 text-gray-700 dark:text-gray-400"
      }`}
    >
      {label}
    </span>
  );
}

export default function NetworkBadge() {
  const { isConnected, networkDetails } = useWallet();

  if (!isConnected) return null;
  const network = networkDetails?.network ?? "unknown";

  return (
    <div className="flex items-center" aria-label={`Connected to Stellar ${NETWORK_LABELS[network as keyof typeof NETWORK_LABELS] ?? "Unknown"} network`}>
      <BadgeLabel network={network} />
    </div>
  );
}
