import type { StellarNetworkId } from "@/services/wallet";

/** Soroban RPC endpoint used for each supported Stellar network. */
export const SOROBAN_RPC_URLS: Record<Exclude<StellarNetworkId, "unknown">, string> = {
  mainnet: "https://soroban-mainnet.stellar.org",
  testnet: "https://soroban-testnet.stellar.org",
  futurenet: "https://rpc-futurenet.stellar.org",
};

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

/** Error raised when a Soroban RPC request cannot be completed or is rejected. */
export class RpcWrapperError extends Error {
  /** JSON-RPC error code, or the HTTP status code for transport failures. */
  readonly code?: number;
  /** HTTP status code when the failure came from the transport layer. */
  readonly status?: number;
  readonly data?: unknown;

  constructor(
    message: string,
    options: { code?: number; status?: number; data?: unknown } = {}
  ) {
    super(message);
    this.name = "RpcWrapperError";
    this.code = options.code;
    this.status = options.status;
    this.data = options.data;
  }
}

let nextRequestId = 1;

/** Resets the JSON-RPC request id sequence. Exposed for deterministic tests. */
export function resetRequestId(): void {
  nextRequestId = 1;
}

/**
 * Resolves the Soroban RPC base URL for a network.
 * Throws for unknown networks instead of silently hitting the wrong endpoint.
 */
export function getSorobanRpcUrl(network: StellarNetworkId): string {
  if (network === "unknown") {
    throw new RpcWrapperError(
      "Cannot resolve a Soroban RPC endpoint for an unknown network."
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
 * `RpcWrapperError` so callers can render an error state without inspecting
 * the raw response.
 */
export async function sorobanRpcRequest<T>(
  method: string,
  params: Record<string, unknown>,
  network: StellarNetworkId
): Promise<T> {
  const url = getSorobanRpcUrl(network);
  const request = buildRpcRequest(method, params);

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new RpcWrapperError(`Soroban RPC request failed: ${message}`);
  }

  if (!response.ok) {
    throw new RpcWrapperError(
      `Soroban RPC request failed with status ${response.status}`,
      { status: response.status }
    );
  }

  let payload: RpcResponse<T>;

  try {
    payload = (await response.json()) as RpcResponse<T>;
  } catch {
    throw new RpcWrapperError("Soroban RPC returned an invalid JSON response");
  }

  if (payload.error) {
    throw new RpcWrapperError(payload.error.message, {
      code: payload.error.code,
      data: payload.error.data,
    });
  }

  return payload.result as T;
}

export interface SorobanLedger {
  sequence: number;
  id: string;
  protocolVersion?: number;
}

/** Fetches the latest closed ledger known to the RPC node. */
export async function getLatestLedger(network: StellarNetworkId): Promise<SorobanLedger> {
  return sorobanRpcRequest<SorobanLedger>("getLatestLedger", {}, network);
}

export interface SorobanHealth {
  status: "healthy" | "unhealthy";
  latestLedger?: number;
  oldestLedger?: number;
}

/** Fetches the health status of the RPC node. */
export async function getHealth(network: StellarNetworkId): Promise<SorobanHealth> {
  return sorobanRpcRequest<SorobanHealth>("getHealth", {}, network);
}

export interface SimulationResult {
  transactionData: string;
  minResourceFee?: string;
  latestLedger?: number;
  error?: string;
}

/**
 * Simulates a prepared transaction XDR so the UI can display the resource
 * fee and result before the user signs. Simulation-level failures are thrown
 * like any other RPC error, keeping the caller's error state in sync.
 */
export async function simulateTransaction(
  transactionXdr: string,
  network: StellarNetworkId
): Promise<SimulationResult> {
  return sorobanRpcRequest<SimulationResult>(
    "simulateTransaction",
    { transaction: transactionXdr },
    network
  );
}
