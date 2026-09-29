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

function optionalPositiveIntEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`[Config] ${key} must be a positive integer, got "${raw}"`);
    process.exit(1);
  }
  return value;
}

function rpcUrlList(): string[] {
  return Array.from(
    new Set(
      [
        process.env.STELLAR_RPC_URL,
        process.env.STELLAR_RPC_URL_2,
        process.env.STELLAR_RPC_URL_3,
      ].filter((value): value is string => Boolean(value))
    )
  );
}

export const env = {
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  PORT: parseInt(optionalEnv("PORT", "4000"), 10),

  /** MongoDB connection string, e.g. mongodb://localhost:27017/stellarproof */
  MONGODB_URI: requireEnv("MONGODB_URI"),

  /** Soroban/Stellar RPC endpoint, e.g. https://soroban-testnet.stellar.org */
  STELLAR_RPC_URL: requireEnv("STELLAR_RPC_URL"),

  /** Optional backup RPC endpoints used when the primary fails. */
  STELLAR_RPC_URL_2: optionalEnv("STELLAR_RPC_URL_2", ""),
  STELLAR_RPC_URL_3: optionalEnv("STELLAR_RPC_URL_3", ""),

  /** Primary + backup RPC endpoints in failover order. */
  STELLAR_RPC_URLS: rpcUrlList(),

  /** Consecutive network failures before an endpoint's circuit opens. */
  STELLAR_RPC_FAILURE_THRESHOLD: parseInt(optionalEnv("STELLAR_RPC_FAILURE_THRESHOLD", "3"), 10),

  /** How long an open circuit stays open before a half-open trial (ms). */
  STELLAR_RPC_COOLDOWN_MS: parseInt(optionalEnv("STELLAR_RPC_COOLDOWN_MS", "30000"), 10),

  /** Per-request timeout for RPC calls (ms). */
  STELLAR_RPC_TIMEOUT_MS: parseInt(optionalEnv("STELLAR_RPC_TIMEOUT_MS", "10000"), 10),

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

  /** Contract addresses, signers, and event ingestion settings. */
  STELLAR_REGISTRY_CONTRACT_ID: optionalEnv("STELLAR_REGISTRY_CONTRACT_ID", ""),
  STELLAR_ORACLE_CONTRACT_ID: optionalEnv("STELLAR_ORACLE_CONTRACT_ID", ""),
  STELLAR_REGISTRY_ADMIN_SECRET_KEY: optionalEnv("STELLAR_REGISTRY_ADMIN_SECRET_KEY", ""),
  STELLAR_ORACLE_SECRET_KEY: optionalEnv("STELLAR_ORACLE_SECRET_KEY", ""),
  STELLAR_PROVENANCE_CONTRACT_ID: optionalEnv("STELLAR_PROVENANCE_CONTRACT_ID", ""),
  EVENT_INGESTION_START_LEDGER: parseInt(optionalEnv("EVENT_INGESTION_START_LEDGER", "0"), 10),
  EVENT_INGESTION_LIMIT: optionalPositiveIntEnv("EVENT_INGESTION_LIMIT", 100),
  EVENT_INGESTION_POLL_INTERVAL_MS: optionalPositiveIntEnv(
    "EVENT_INGESTION_POLL_INTERVAL_MS",
    5_000
  ),
  STELLAR_TX_CONFIRMATION_TIMEOUT_MS: optionalPositiveIntEnv(
    "STELLAR_TX_CONFIRMATION_TIMEOUT_MS",
    120_000
  ),

  /** Allowed CORS origin for the frontend. */
  CORS_ORIGIN: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),

  /** Morgan log format: 'dev' | 'combined' | 'tiny' etc. */
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "dev"),

  /** Secret used to sign and verify JWTs */
  JWT_SECRET: requireEnv("JWT_SECRET"),

  /** JWT expiry duration, e.g. '7d', '24h' */
  JWT_EXPIRES_IN: optionalEnv("JWT_EXPIRES_IN", "7d"),

  /** Cloudinary Cloud Name */
  CLOUDINARY_CLOUD_NAME: optionalEnv("CLOUDINARY_CLOUD_NAME", ""),

  /** Cloudinary API Key */
  CLOUDINARY_API_KEY: optionalEnv("CLOUDINARY_API_KEY", ""),

  /** Cloudinary API Secret */
  CLOUDINARY_API_SECRET: optionalEnv("CLOUDINARY_API_SECRET", ""),

  /** Pinata JWT for IPFS uploads (v3 API) */
  PINATA_JWT: requireEnv("PINATA_JWT"),

  /** Pinata public gateway base URL */
  PINATA_GATEWAY_URL: optionalEnv("PINATA_GATEWAY_URL", "https://gateway.pinata.cloud/ipfs"),

  /**
   * Bounded polling window used to observe Pinata's real pin state after an
   * upload, so responses report `pinning` until the pin actually propagates.
   */
  IPFS_PIN_POLL_INTERVAL_MS: optionalPositiveIntEnv("IPFS_PIN_POLL_INTERVAL_MS", 500),
  IPFS_PIN_POLL_TIMEOUT_MS: optionalPositiveIntEnv("IPFS_PIN_POLL_TIMEOUT_MS", 6_000),
  IPFS_PIN_POLL_MAX_ATTEMPTS: optionalPositiveIntEnv("IPFS_PIN_POLL_MAX_ATTEMPTS", 8),

  /** Max time (ms) to wait for the post-upload gateway availability probe */
  IPFS_AVAILABILITY_TIMEOUT_MS: optionalPositiveIntEnv("IPFS_AVAILABILITY_TIMEOUT_MS", 4_000),

  /** Max time (ms) to wait for the IPFS gateway when resolving a CID */
  IPFS_RESOLVE_TIMEOUT_MS: optionalPositiveIntEnv("IPFS_RESOLVE_TIMEOUT_MS", 15_000),

  /** Max bytes downloaded from the IPFS gateway when resolving a CID (defaults to the 100 MB upload limit) */
  IPFS_RESOLVE_MAX_BYTES: optionalPositiveIntEnv("IPFS_RESOLVE_MAX_BYTES", 100 * 1024 * 1024),

  /** Per-attempt timeout (ms) for a single IPFS upload request */
  IPFS_UPLOAD_TIMEOUT_MS: optionalPositiveIntEnv("IPFS_UPLOAD_TIMEOUT_MS", 30_000),

  /** Additional IPFS upload attempts after the first failure (0 disables retries) */
  IPFS_UPLOAD_MAX_RETRIES: optionalNonNegativeIntEnv("IPFS_UPLOAD_MAX_RETRIES", 2),

  /** Base delay (ms) for the exponential backoff between IPFS upload attempts */
  IPFS_UPLOAD_BACKOFF_MS: optionalPositiveIntEnv("IPFS_UPLOAD_BACKOFF_MS", 500),
} as const;
