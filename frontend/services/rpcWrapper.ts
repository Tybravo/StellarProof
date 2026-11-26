/**
 * Stellar & Soroban RPC Failover Wrapper
 *
 * Implements high-availability RPC network fallback logic with array rotation,
 * endpoint health tracking, and automatic failover to secondary nodes.
 *
 * @module services/rpcWrapper
 */

import { rpc } from '@stellar/stellar-sdk';

export type StellarNetwork = 'mainnet' | 'testnet' | 'futurenet';

export type RpcConnectionStatus = 'connected' | 'reconnecting' | 'failed' | 'degraded';

export interface RpcNodeHealth {
  endpoint: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastError?: string;
  responseTimeMs?: number;
}

export interface RpcStateChangePayload {
  status: RpcConnectionStatus;
  activeEndpoint: string;
  previousEndpoint?: string;
  error?: string;
}

export interface RpcWrapperOptions {
  network?: StellarNetwork;
  endpoints?: string[];
  cooldownPeriodMs?: number;
  timeoutMs?: number;
  maxRetriesPerNode?: number;
  onStateChange?: (state: RpcStateChangePayload) => void;
  onEndpointChange?: (newEndpoint: string, previousEndpoint: string) => void;
}

/**
 * Standard default fallback nodes per network.
 */
export const DEFAULT_RPC_ENDPOINTS: Record<StellarNetwork, string[]> = {
  testnet: [
    'https://soroban-testnet.stellar.org',
    'https://rpc-testnet.stellar.org',
    'https://testnet.sorobanrpc.com',
    'https://soroban-rpc-testnet.stellar.org',
  ],
  mainnet: [
    'https://soroban-rpc.mainnet.stellar.org',
    'https://mainnet.sorobanrpc.com',
    'https://rpc.stellar.org',
  ],
  futurenet: [
    'https://rpc-futurenet.stellar.org',
    'https://soroban-rpc-futurenet.stellar.org',
  ],
};

const DEFAULT_COOLDOWN_MS = 30000;
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Pure array rotation helper: shifts first item to the back of the array.
 * e.g. [A, B, C] -> [B, C, A]
 *
 * @param array - Array of items to rotate
 * @returns New rotated array
 */
export function rotateEndpoints<T>(array: T[]): T[] {
  if (array.length <= 1) return [...array];
  const [first, ...rest] = array;
  return [...rest, first];
}

/**
 * Resolves the initial array of RPC endpoints based on environment variables and defaults.
 */
export function resolveRpcEndpoints(
  network: StellarNetwork = 'testnet',
  customEndpoints?: string[]
): string[] {
  if (customEndpoints && customEndpoints.length > 0) {
    return [...customEndpoints];
  }

  const primaryFromEnv =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_VITE_SOROBAN_RPC_URL
      : undefined;

  const fallbacksFromEnv =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SOROBAN_RPC_FALLBACKS
      ? process.env.NEXT_PUBLIC_SOROBAN_RPC_FALLBACKS.split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const defaults = DEFAULT_RPC_ENDPOINTS[network] || DEFAULT_RPC_ENDPOINTS.testnet;

  const combined = [
    ...(primaryFromEnv ? [primaryFromEnv] : []),
    ...fallbacksFromEnv,
    ...defaults,
  ];

  // Deduplicate endpoints preserving order
  return Array.from(new Set(combined));
}

/**
 * Custom error thrown when all available RPC endpoints fail.
 */
export class AllRpcEndpointsFailedError extends Error {
  public readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    const errorDetails = Object.entries(errors)
      .map(([endpoint, err]) => `  - ${endpoint}: ${err}`)
      .join('\n');
    super(`All Stellar RPC endpoints failed:\n${errorDetails}`);
    this.name = 'AllRpcEndpointsFailedError';
    this.errors = errors;
  }
}

/**
 * Determines whether an error is transient or network-related and suitable for RPC failover.
 */
export function isRecoverableRpcError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('socket') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('unavailable') ||
    message.includes('failed to fetch') ||
    message.includes('rpc')
  );
}

/**
 * Manages an ordered pool of RPC endpoints with array rotation and health tracking.
 */
export class RpcEndpointPool {
  private endpoints: string[];
  private nodeHealth: Map<string, RpcNodeHealth>;
  private cooldownMs: number;
  private connectionStatus: RpcConnectionStatus = 'connected';
  private stateChangeListeners: Set<(state: RpcStateChangePayload) => void> = new Set();
  private endpointChangeListeners: Set<(next: string, prev: string) => void> = new Set();

  constructor(endpoints: string[], cooldownMs: number = DEFAULT_COOLDOWN_MS) {
    if (!endpoints || endpoints.length === 0) {
      throw new Error('RpcEndpointPool requires at least one RPC endpoint.');
    }
    this.endpoints = [...endpoints];
    this.cooldownMs = cooldownMs;
    this.nodeHealth = new Map();

    for (const ep of this.endpoints) {
      this.nodeHealth.set(ep, {
        endpoint: ep,
        isHealthy: true,
        consecutiveFailures: 0,
      });
    }
  }

  public getActiveEndpoint(): string {
    return this.endpoints[0];
  }

  public getAllEndpoints(): string[] {
    return [...this.endpoints];
  }

  public getNodeHealth(endpoint?: string): RpcNodeHealth | undefined {
    return this.nodeHealth.get(endpoint || this.getActiveEndpoint());
  }

  public getAllNodeHealth(): RpcNodeHealth[] {
    return Array.from(this.nodeHealth.values());
  }

  public getConnectionStatus(): RpcConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Rotates endpoints by moving the current active primary to the end of the array.
   * Updates state and notifies subscribers.
   */
  public rotate(): string {
    if (this.endpoints.length <= 1) return this.endpoints[0];

    const prev = this.endpoints[0];
    this.endpoints = rotateEndpoints(this.endpoints);
    const next = this.endpoints[0];

    this.notifyEndpointChange(next, prev);
    return next;
  }

  /**
   * Marks an endpoint as successful, resetting consecutive failure counts.
   */
  public markSuccess(endpoint: string, responseTimeMs?: number): void {
    const health = this.nodeHealth.get(endpoint) || {
      endpoint,
      isHealthy: true,
      consecutiveFailures: 0,
    };

    health.isHealthy = true;
    health.consecutiveFailures = 0;
    health.lastSuccessTime = Date.now();
    health.lastError = undefined;
    if (responseTimeMs !== undefined) {
      health.responseTimeMs = responseTimeMs;
    }
    this.nodeHealth.set(endpoint, health);

    if (this.connectionStatus !== 'connected') {
      this.setStatus('connected', endpoint);
    }
  }

  /**
   * Marks an endpoint as failed and registers the error.
   */
  public markFailure(endpoint: string, error: unknown): void {
    const errMsg = error instanceof Error ? error.message : String(error);
    const health = this.nodeHealth.get(endpoint) || {
      endpoint,
      isHealthy: false,
      consecutiveFailures: 0,
    };

    health.consecutiveFailures += 1;
    health.lastFailureTime = Date.now();
    health.lastError = errMsg;
    if (health.consecutiveFailures >= 2) {
      health.isHealthy = false;
    }
    this.nodeHealth.set(endpoint, health);

    const hasHealthyAlternative = this.endpoints.some((ep) => {
      if (ep === endpoint) return false;
      const h = this.nodeHealth.get(ep);
      return !h || h.isHealthy || (h.lastFailureTime && Date.now() - h.lastFailureTime > this.cooldownMs);
    });

    this.setStatus(hasHealthyAlternative ? 'degraded' : 'reconnecting', endpoint, errMsg);
  }

  public onStateChange(listener: (state: RpcStateChangePayload) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  public onEndpointChange(listener: (next: string, prev: string) => void): () => void {
    this.endpointChangeListeners.add(listener);
    return () => this.endpointChangeListeners.delete(listener);
  }

  private setStatus(status: RpcConnectionStatus, activeEndpoint: string, error?: string): void {
    this.connectionStatus = status;
    const payload: RpcStateChangePayload = {
      status,
      activeEndpoint,
      error,
    };
    for (const listener of this.stateChangeListeners) {
      try {
        listener(payload);
      } catch {
        // Ignore subscriber exceptions
      }
    }
  }

  private notifyEndpointChange(next: string, prev: string): void {
    for (const listener of this.endpointChangeListeners) {
      try {
        listener(next, prev);
      } catch {
        // Ignore subscriber exceptions
      }
    }
  }
}

/**
 * Executes an operation with automatic fallback across the RPC endpoint pool.
 * If the current endpoint fails with a recoverable error, the pool rotates to
 * secondary nodes and retries until success or exhaustion.
 *
 * @param pool - The RpcEndpointPool to rotate through
 * @param operation - The operation to execute using a given endpoint URL or rpc.Server
 * @param timeoutMs - Optional timeout per attempt
 */
export async function executeWithRpcFallback<T>(
  pool: RpcEndpointPool,
  operation: (server: rpc.Server, endpoint: string) => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const allEndpoints = pool.getAllEndpoints();
  const maxAttempts = allEndpoints.length;
  const failureLog: Record<string, string> = {};

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const activeEndpoint = pool.getActiveEndpoint();
    const server = new rpc.Server(activeEndpoint);
    const start = Date.now();

    try {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`RPC request timed out after ${timeoutMs}ms on ${activeEndpoint}`));
        }, timeoutMs);
      });

      const result = await Promise.race([operation(server, activeEndpoint), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      pool.markSuccess(activeEndpoint, Date.now() - start);
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      failureLog[activeEndpoint] = errMsg;

      pool.markFailure(activeEndpoint, error);

      // Rotate array so next endpoint becomes primary for subsequent attempt
      pool.rotate();

      // If we exhausted all endpoints, break out
      if (attempt === maxAttempts - 1) {
        break;
      }
    }
  }

  throw new AllRpcEndpointsFailedError(failureLog);
}

/**
 * Drop-in wrapper around Soroban rpc.Server with built-in high-availability
 * network fallback, automatic array rotation, and endpoint health management.
 */
export class FailoverRpcServer {
  private pool: RpcEndpointPool;
  private timeoutMs: number;

  constructor(
    endpointsOrPrimary?: string | string[],
    options?: RpcWrapperOptions
  ) {
    let endpoints: string[];

    if (Array.isArray(endpointsOrPrimary) && endpointsOrPrimary.length > 0) {
      endpoints = endpointsOrPrimary;
    } else if (typeof endpointsOrPrimary === 'string') {
      endpoints = resolveRpcEndpoints(options?.network || 'testnet', [endpointsOrPrimary]);
    } else {
      endpoints = resolveRpcEndpoints(options?.network || 'testnet', options?.endpoints);
    }

    this.pool = new RpcEndpointPool(endpoints, options?.cooldownPeriodMs);
    this.timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

    if (options?.onStateChange) {
      this.pool.onStateChange(options.onStateChange);
    }
    if (options?.onEndpointChange) {
      this.pool.onEndpointChange(options.onEndpointChange);
    }
  }

  public getActiveEndpoint(): string {
    return this.pool.getActiveEndpoint();
  }

  public getAllEndpoints(): string[] {
    return this.pool.getAllEndpoints();
  }

  public getConnectionStatus(): RpcConnectionStatus {
    return this.pool.getConnectionStatus();
  }

  public rotate(): string {
    return this.pool.rotate();
  }

  public getPool(): RpcEndpointPool {
    return this.pool;
  }

  public onStateChange(listener: (state: RpcStateChangePayload) => void): () => void {
    return this.pool.onStateChange(listener);
  }

  public onEndpointChange(listener: (next: string, prev: string) => void): () => void {
    return this.pool.onEndpointChange(listener);
  }

  /**
   * Executes any operation against an rpc.Server with fallback.
   */
  public execute<T>(operation: (server: rpc.Server, endpoint: string) => Promise<T>): Promise<T> {
    return executeWithRpcFallback(this.pool, operation, this.timeoutMs);
  }

  /* ------------------- Proxied Soroban RPC Methods ------------------- */

  public getLatestLedger(): ReturnType<rpc.Server['getLatestLedger']> {
    return this.execute((server) => server.getLatestLedger());
  }

  public getEvents(
    request: Parameters<rpc.Server['getEvents']>[0]
  ): ReturnType<rpc.Server['getEvents']> {
    return this.execute((server) => server.getEvents(request));
  }

  public getTransaction(hash: string): ReturnType<rpc.Server['getTransaction']> {
    return this.execute((server) => server.getTransaction(hash));
  }

  public sendTransaction(
    transaction: Parameters<rpc.Server['sendTransaction']>[0]
  ): ReturnType<rpc.Server['sendTransaction']> {
    return this.execute((server) => server.sendTransaction(transaction));
  }

  public simulateTransaction(
    transaction: Parameters<rpc.Server['simulateTransaction']>[0]
  ): ReturnType<rpc.Server['simulateTransaction']> {
    return this.execute((server) => server.simulateTransaction(transaction));
  }

  public getHealth(): ReturnType<rpc.Server['getHealth']> {
    return this.execute((server) => server.getHealth());
  }

  public getNetwork(): ReturnType<rpc.Server['getNetwork']> {
    return this.execute((server) => server.getNetwork());
  }

  public getAccount(address: string): ReturnType<rpc.Server['getAccount']> {
    return this.execute((server) => server.getAccount(address));
  }
}

/**
 * Factory to create a FailoverRpcServer instance.
 */
export function createFailoverRpcServer(
  endpointsOrPrimary?: string | string[],
  options?: RpcWrapperOptions
): FailoverRpcServer {
  return new FailoverRpcServer(endpointsOrPrimary, options);
}
