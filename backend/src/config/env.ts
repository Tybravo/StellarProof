/**
 * Centralised environment configuration.
 * All process.env reads happen here. Downstream modules import from `env`
 * and never access process.env directly.
 *
 * The service will exit at startup if any required variable is absent,
 * preventing silent misconfiguration at request time.
 */
import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: parseInt(optionalEnv("PORT", "4000"), 10),

  /** MongoDB connection string, e.g. mongodb://localhost:27017/stellarproof */
  MONGODB_URI: requireEnv("MONGODB_URI"),

  /** Soroban/Stellar RPC endpoint, e.g. https://soroban-testnet.stellar.org */
  STELLAR_RPC_URL: requireEnv("STELLAR_RPC_URL"),

  /**
   * Network passphrase used when building simulation transactions.
   * Testnet: "Test SDF Network ; September 2015"
   * Mainnet: "Public Global Stellar Network ; September 2015"
   */
  STELLAR_NETWORK_PASSPHRASE: requireEnv("STELLAR_NETWORK_PASSPHRASE"),

  /**
   * Name of the balance-query entry point on the NFT Soroban contract.
   * Defaults to "balance" (SEP-41 standard). Override if the deployed
   * contract uses a different function name (e.g. "balance_of").
   */
  STELLAR_NFT_BALANCE_FN: optionalEnv("STELLAR_NFT_BALANCE_FN", "balance"),

  /** Allowed CORS origin for the frontend. */
  CORS_ORIGIN: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),

  /** Morgan log format: 'dev' | 'combined' | 'tiny' etc. */
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "dev"),
} as const;
