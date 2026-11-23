import { getExpectedNetwork } from "@/config/network";
import type { StellarNetworkId } from "@/services/wallet";

/**
 * Default public Soroban RPC endpoints, used when no endpoint is configured
 * through the environment.
 */
export const SOROBAN_RPC_URLS: Record<Exclude<StellarNetworkId, "unknown">, string> = {
  mainnet: "https://soroban-mainnet.stellar.org",
  testnet: "https://soroban-testnet.stellar.org",
  futurenet: "https://rpc-futurenet.stellar.org",
};

/** How long a request may take before it is aborted, in milliseconds. */
export const DEFAULT_RPC_TIMEOUT_MS = 15_000;

export interface RpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface RpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Broad failure category so UI code can decide how to present an error
 * without parsing messages.
 */
export type RpcErrorKind =
  | "config"
  | "network"
  | "http"
  | "invalid-response"
  | "rpc"
  | "aborted"
  | "timeout";

/** Error raised when a Soroban RPC request cannot be completed or is rejected. */
export class RpcWrapperError extends Error {
  readonly kind: RpcErrorKind;
  /** JSON-RPC error code, when the failure came from the RPC layer. */
  readonly code?: number;
  /** HTTP status code, when the failure came from the transport layer. */
  readonly status?: number;
  readonly data?: unknown;

  constructor(
    message: string,
    options: {
      kind?: RpcErrorKind;
      code?: number;
      status?: number;
      data?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "RpcWrapperError";
    this.kind = options.kind ?? "network";
    this.code = options.code;
    this.status = options.status;
    this.data = options.data;
  }
}

export interface RpcRequestOptions {
  /**
   * Network whose default endpoint should be used when no endpoint is
   * configured via the environment. Defaults to `NEXT_PUBLIC_STELLAR_NETWORK`
   * (or testnet).
   */
  network?: StellarNetworkId;
  /** Explicit endpoint override, useful for tests and network switching. */
  rpcUrl?: string;
  /** Caller cancellation, e.g. when a component unmounts. */
  signal?: AbortSignal;
  /** Per-request timeout. Set to `0` to disable the default timeout. */
  timeoutMs?: number;
}

let nextRequestId = 1;

/** Resets the JSON-RPC request id sequence. Exposed for deterministic tests. */
export function resetRequestId(): void {
  nextRequestId = 1;
}

function normalizeRpcUrl(rawUrl: string, source: string): string {
  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new RpcWrapperError(
      `${source} must be an absolute HTTP(S) URL.`,
      { kind: "config" }
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new RpcWrapperError(
      `${source} must use the http: or https: protocol.`,
      { kind: "config" }
    );
  }

  // Avoid double slashes when joining paths in future helpers.
  return trimmed.replace(/\/+$/, "");
}

/**
 * Reads the configured RPC endpoint. Browser code needs the public variable;
 * `STELLAR_RPC_URL` is honoured for server-side rendering and tests so the
 * frontend can share the backend's variable name.
 */
function getConfiguredRpcUrl(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;

  const raw =
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL?.trim() ||
    process.env.STELLAR_RPC_URL?.trim();

  if (!raw) return undefined;

  return normalizeRpcUrl(raw, "NEXT_PUBLIC_STELLAR_RPC_URL");
}

/**
 * Resolves the Soroban RPC endpoint for a network. A configured environment
 * endpoint always wins; otherwise the network's public default is used.
 * Unknown networks fail closed instead of silently hitting the wrong chain.
 */
export function getSorobanRpcUrl(
  network: StellarNetworkId = getExpectedNetwork()
): string {
  const configured = getConfiguredRpcUrl();
  if (configured) return configured;

  if (network === "unknown") {
    throw new RpcWrapperError(
      "Cannot resolve a Soroban RPC endpoint for an unknown network.",
      { kind: "config" }
    );
  }

  return SOROBAN_RPC_URLS[network];
}

/** Builds the JSON-RPC 2.0 envelope sent to the Soroban RPC endpoint. */
export function buildRpcRequest(
  method: string,
  params: Record<string, unknown> = {},
  id: number = nextRequestId++
): RpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method,
    params,
  };
}

/**
 * Sends a single JSON-RPC call to the Soroban RPC endpoint and unwraps the
 * result. Transport failures and JSON-RPC errors are surfaced as
 * `RpcWrapperError`, so callers can render an error state without inspecting
 * the raw response. Loading state is owned by the caller (for example a React
 * Query `isPending` flag); cancellation and timeouts are handled here.
 */
export async function sorobanRpcRequest<T>(
  method: string,
  params: Record<string, unknown> = {},
  options: RpcRequestOptions = {}
): Promise<T> {
  const url = options.rpcUrl
    ? normalizeRpcUrl(options.rpcUrl, "rpcUrl")
    : getSorobanRpcUrl(options.network);
  const request = buildRpcRequest(method, params);

  if (options.signal?.aborted) {
    throw new RpcWrapperError("Soroban RPC request was aborted.", {
      kind: "aborted",
    });
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;
  let timedOut = false;

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;

  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  try {
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new RpcWrapperError(
          `Soroban RPC request timed out after ${timeoutMs}ms.`,
          { kind: "timeout" }
        );
      }

      if (controller.signal.aborted) {
        throw new RpcWrapperError("Soroban RPC request was aborted.", {
          kind: "aborted",
        });
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new RpcWrapperError(`Soroban RPC request failed: ${message}`, {
        kind: "network",
      });
    }

    if (!response.ok) {
      throw new RpcWrapperError(
        `Soroban RPC request failed with status ${response.status}.`,
        { kind: "http", status: response.status }
      );
    }

    let payload: RpcResponse<T>;

    try {
      payload = (await response.json()) as RpcResponse<T>;
    } catch {
      throw new RpcWrapperError(
        "Soroban RPC returned an invalid JSON response.",
        { kind: "invalid-response" }
      );
    }

    if (payload.error) {
      throw new RpcWrapperError(payload.error.message, {
        kind: "rpc",
        code: payload.error.code,
        data: payload.error.data,
      });
    }

    if (!("result" in payload)) {
      throw new RpcWrapperError(
        "Soroban RPC response did not include a result.",
        { kind: "invalid-response" }
      );
    }

    return payload.result as T;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export interface SorobanLedger {
  sequence: number;
  id: string;
  protocolVersion?: number;
  headerXdr?: string;
  metadataXdr?: string;
}

/** Fetches the latest closed ledger known to the RPC node. */
export async function getLatestLedger(
  options: RpcRequestOptions = {}
): Promise<SorobanLedger> {
  return sorobanRpcRequest<SorobanLedger>("getLatestLedger", {}, options);
}

export interface SorobanHealth {
  status: "healthy" | "unhealthy";
  latestLedger?: number;
  oldestLedger?: number;
}

/** Fetches the health status of the RPC node. */
export async function getHealth(
  options: RpcRequestOptions = {}
): Promise<SorobanHealth> {
  return sorobanRpcRequest<SorobanHealth>("getHealth", {}, options);
}

export interface SorobanAccountBalance {
  /** Snake-case as returned by the RPC (`asset_type`). */
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface SorobanAccount {
  id: string;
  sequence: string;
  balances?: SorobanAccountBalance[];
  sequenceLedger?: number;
  sequenceTime?: string;
}

/**
 * Fetches a Stellar account (including its sequence number, required to build
 * transactions) from the Soroban RPC endpoint.
 */
export async function getAccount(
  address: string,
  options: RpcRequestOptions = {}
): Promise<SorobanAccount> {
  const trimmed = address?.trim();

  if (!trimmed) {
    throw new RpcWrapperError(
      "getAccount requires a non-empty account address.",
      { kind: "config" }
    );
  }

  return sorobanRpcRequest<SorobanAccount>(
    "getAccount",
    { address: trimmed },
    options
  );
}

export type SorobanEventType = "system" | "contract" | "diagnostic";

export type SorobanEventFilter = {
  type?: SorobanEventType;
  /** Contract IDs (C...) whose events should be returned. */
  contractIds?: string[];
  /** Topic filters, each a base64-encoded ScVal per topic position. */
  topics?: string[][];
};

export type GetEventsParams = {
  /** First ledger to scan. Mutually exclusive with `cursor`. */
  startLedger?: number;
  /** Last ledger to scan. */
  endLedger?: number;
  /** Pagination cursor returned by a previous `getEvents` call. */
  cursor?: string;
  filters?: SorobanEventFilter[];
  /** Maximum number of events to return (RPC caps this at 10,000). */
  limit?: number;
};

export interface SorobanEvent {
  type: SorobanEventType;
  ledger: number;
  ledgerClosedAt: string;
  contractId?: string;
  id: string;
  pagingToken: string;
  /** Base64-encoded `ScVal` topics, consumable by the event parser. */
  topic: string[];
  /** Base64-encoded `ScVal` payload. */
  value: string;
  inSuccessfulContractCall: boolean;
  txHash: string;
}

export interface GetEventsResult {
  events: SorobanEvent[];
  latestLedger: number;
  cursor?: string;
}

/**
 * Fetches contract events, optionally filtered by contract and topics. The
 * RPC requires exactly one of `startLedger` or `cursor`; invalid combinations
 * fail before a network call is made.
 */
export async function getEvents(
  params: GetEventsParams = {},
  options: RpcRequestOptions = {}
): Promise<GetEventsResult> {
  const hasStartLedger = typeof params.startLedger === "number";
  const hasCursor =
    typeof params.cursor === "string" && params.cursor.length > 0;

  if (hasStartLedger === hasCursor) {
    throw new RpcWrapperError(
      "getEvents requires exactly one of startLedger or cursor.",
      { kind: "config" }
    );
  }

  return sorobanRpcRequest<GetEventsResult>("getEvents", params, options);
}

export interface SimulationResult {
  transactionData: string;
  minResourceFee?: string;
  latestLedger?: number;
  error?: string;
  events?: string[];
}

/**
 * Simulates a prepared transaction XDR so the UI can display the resource fee
 * and result before the user signs. Simulation-level failures are thrown like
 * any other RPC error, keeping the caller's error state in sync.
 */
export async function simulateTransaction(
  transactionXdr: string,
  options: RpcRequestOptions = {}
): Promise<SimulationResult> {
  return sorobanRpcRequest<SimulationResult>(
    "simulateTransaction",
    { transaction: transactionXdr },
    options
  );
}
