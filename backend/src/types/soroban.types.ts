/**
 * Types for Soroban RPC access with multi-endpoint failover.
 */

/**
 * Circuit breaker state for a single RPC endpoint.
 * - closed:    endpoint is in rotation
 * - open:      endpoint is skipped until the cooldown elapses
 * - half_open: cooldown elapsed; the next request is a trial
 */
export type RpcCircuitState = 'closed' | 'open' | 'half_open';

export interface RpcEndpointStatus {
  /** Position in the failover order (1 = primary). */
  priority: number;
  /** Redacted endpoint (origin only) so API keys in paths/queries never leak. */
  endpoint: string;
  state: RpcCircuitState;
  consecutiveFailures: number;
  openedAt?: Date;
  retryAt?: Date;
  lastError?: string;
}

export interface RpcFailoverOptions {
  failureThreshold: number;
  cooldownMs: number;
  timeoutMs: number;
  allowHttp: boolean;
}

export interface RpcFailoverEventInput {
  operation: string;
  fromEndpoint: string;
  toEndpoint?: string;
  reason: string;
  errorCode?: string;
  circuitOpened: boolean;
}

export interface RpcNetworkStatus {
  activeEndpoint: string | null;
  latestLedger: {
    sequence: number;
    protocolVersion: string;
    id: string;
  };
  endpoints: RpcEndpointStatus[];
  recentFailovers: Array<{
    operation: string;
    fromEndpoint: string;
    toEndpoint?: string;
    reason: string;
    errorCode?: string;
    circuitOpened: boolean;
    occurredAt: Date;
  }>;
}

// ---------------------------------------------------------------------------
// Transaction submission and confirmation types
// ---------------------------------------------------------------------------

/**
 * Diagnostics returned when a transaction fails on-chain or is rejected
 * before reaching a ledger.
 */
export interface TransactionFailureDiagnostics {
  /** Hex transaction hash. */
  txHash: string;
  /** Top-level Stellar result code string, e.g. `tx_failed`. */
  resultCode: string;
  /** Per-operation result code strings (non-empty for tx_failed). */
  operationResultCodes: string[];
  /** Raw diagnostic event XDR strings from the RPC response. */
  diagnosticEventsXdr: string[];
  /**
   * Ledger at which the transaction failed. `undefined` means the failure
   * occurred before the transaction reached a ledger (e.g. submission error)
   * and the transaction cannot have taken effect.
   */
  ledger?: number;
}

/**
 * Returned by `SorobanService.getTransactionWithConfirmation` when the
 * transaction has been included and applied on-chain with a SUCCESS outcome.
 */
export interface SuccessfulTransactionStatus {
  status: 'SUCCESS';
  /** Hex transaction hash (same as the hash submitted). */
  txHash: string;
  /** Ledger sequence number at which the transaction was included. */
  ledger: number;
  /** Unix timestamp (seconds) of the ledger close time. */
  createdAt: number;
  /**
   * The return value of the invoked contract function, serialised as an
   * `xdr.ScVal`. Present for `invoke_host_function` operations; absent for
   * transactions that do not return a value.
   */
  returnValue?: import('@stellar/stellar-sdk').xdr.ScVal;
}
