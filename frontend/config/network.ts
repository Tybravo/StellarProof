import type { StellarNetworkId } from "@/services/wallet";

/**
 * Expected Stellar network for this environment.
 * Set NEXT_PUBLIC_STELLAR_NETWORK=mainnet | testnet in .env
 * Defaults to "testnet" if unset.
 */
export function getExpectedNetwork(): StellarNetworkId {
  const env =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_STELLAR_NETWORK as string | undefined)
      : undefined;
  if (env === "mainnet" || env === "testnet" || env === "futurenet") return env;
  return "testnet";
}

/**
 * When true, wrong-network warning is not shown (e.g. dev mode).
 * Set NEXT_PUBLIC_NETWORK_BYPASS=true in .env
 */
export function isNetworkBypassEnabled(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NEXT_PUBLIC_NETWORK_BYPASS === "true";
}
