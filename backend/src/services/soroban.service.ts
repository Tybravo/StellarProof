import {
  Account,
  FeeBumpTransaction,
  Keypair,
  StrKey,
  Transaction,
  rpc,
} from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { env } from "../config/env";
import { AppError } from "../errors/AppError";
import logger from "../utils/logger";
import RpcFailoverEvent from "../models/RpcFailoverEvent.model";
import type { RpcEndpointStatus, RpcFailoverOptions, RpcNetworkStatus } from "../types/soroban.types";

/**
 * Soroban RPC Service
 *
 * Single entry point for every on-chain interaction. Wraps
 * `@stellar/stellar-sdk`'s `rpc.Server`, reads its configuration from
 * `config/env`, bounds every call with a timeout and converts RPC failures
 * into typed `AppError`s, so controllers never handle raw RPC internals.
 */

export type SorobanOperation =
  | "loadAccount"
  | "getEvents"
  | "getLatestLedger"
  | "simulate"
  | "sendTransaction"
  | "getTransaction";

export type SorobanTransaction = Transaction | FeeBumpTransaction;

export type SimulationResult =
  | rpc.Api.SimulateTransactionSuccessResponse
  | rpc.Api.SimulateTransactionRestoreResponse;

/** Accepted submissions: queued for inclusion or already known to the network */
export type SubmittedTransaction = rpc.Api.SendTransactionResponse & {
  status: "PENDING" | "DUPLICATE";
};

export interface SorobanServiceConfig {
  rpcUrl: string;
  networkPassphrase: string;
  timeoutMs: number;
  allowHttp: boolean;
}

/** Error object thrown by the SDK for JSON-RPC errors and missing ledger entries */
interface RpcErrorPayload {
  code: number;
  message: string;
  data?: unknown;
}

/** Subset of an axios error the SDK surfaces for transport failures */
interface HttpTransportError {
  isAxiosError: true;
  code?: string;
  message: string;
  response?: { status: number };
}

const TRANSACTION_HASH_PATTERN = /^[0-9a-f]{64}$/i;

const JSON_RPC_INVALID_REQUEST = -32600;
const JSON_RPC_INVALID_PARAMS = -32602;

export function redactEndpoint(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return "[invalid-url]";
  }
}

export function isRpcNetworkError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const value = error as { isAxiosError?: boolean; code?: unknown; response?: { status?: number }; message?: unknown };
  if (value.isAxiosError) {
    const status = value.response?.status;
    return status === undefined || status === 429 || status >= 500;
  }
  return typeof value.code === "string" && [
    "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "EAI_AGAIN",
  ].includes(value.code);
}

interface RpcEndpoint {
  url: string;
  server: rpc.Server;
  state: "closed" | "open" | "half_open";
  consecutiveFailures: number;
  openedAt?: Date;
  retryAt?: Date;
  lastError?: string;
}

export class RpcFailover {
  private readonly endpoints: RpcEndpoint[];

  constructor(
    urls: string[],
    private readonly options: RpcFailoverOptions,
    serverFactory: (url: string) => rpc.Server = (url) =>
      new rpc.Server(url, { allowHttp: options.allowHttp, timeout: options.timeoutMs }),
  ) {
    this.endpoints = [];
    for (const url of urls) {
      try {
        if (!options.allowHttp && url.startsWith("http://")) continue;
        this.endpoints.push({
          url,
          server: serverFactory(url),
          state: "closed",
          consecutiveFailures: 0,
        });
      } catch {
        // A malformed endpoint must not prevent healthy endpoints from starting.
      }
    }
  }

  getEndpointStatuses(): RpcEndpointStatus[] {
    this.refreshHalfOpenStates();
    return this.endpoints.map((endpoint, index) => ({
      priority: index + 1,
      endpoint: redactEndpoint(endpoint.url),
      state: endpoint.state,
      consecutiveFailures: endpoint.consecutiveFailures,
      ...(endpoint.openedAt ? { openedAt: endpoint.openedAt } : {}),
      ...(endpoint.retryAt ? { retryAt: endpoint.retryAt } : {}),
      ...(endpoint.lastError ? { lastError: endpoint.lastError } : {}),
    }));
  }

  getActiveEndpoint(): string | null {
    this.refreshHalfOpenStates();
    const endpoint = this.endpoints.find((candidate) => candidate.state !== "open");
    return endpoint ? redactEndpoint(endpoint.url) : null;
  }

  async execute<T>(operation: string, call: (server: rpc.Server) => Promise<T>): Promise<T> {
    this.refreshHalfOpenStates();
    const candidates = this.endpoints.filter((endpoint) => endpoint.state !== "open");
    if (candidates.length === 0) {
      throw new AppError("All Stellar RPC endpoints are unavailable", StatusCodes.SERVICE_UNAVAILABLE, "RPC_UNAVAILABLE");
    }

    let lastError: unknown;
    for (let index = 0; index < candidates.length; index += 1) {
      const endpoint = candidates[index];
      try {
        const result = await call(endpoint.server);
        endpoint.state = "closed";
        endpoint.consecutiveFailures = 0;
        endpoint.openedAt = undefined;
        endpoint.retryAt = undefined;
        endpoint.lastError = undefined;
        return result;
      } catch (error) {
        if (!isRpcNetworkError(error)) throw error;
        lastError = error;
        endpoint.consecutiveFailures += 1;
        endpoint.lastError = error instanceof Error ? error.message : String(error);
        const circuitOpened = endpoint.state === "half_open" ||
          endpoint.consecutiveFailures >= this.options.failureThreshold;
        if (circuitOpened) {
          endpoint.state = "open";
          endpoint.openedAt = new Date(Date.now());
          endpoint.retryAt = new Date(Date.now() + this.options.cooldownMs);
        }

        const event = {
          operation,
          fromEndpoint: redactEndpoint(endpoint.url),
          ...(candidates[index + 1] ? { toEndpoint: redactEndpoint(candidates[index + 1].url) } : {}),
          reason: endpoint.lastError,
          ...(typeof (error as { code?: unknown })?.code === "string"
            ? { errorCode: String((error as { code: string }).code) }
            : typeof (error as { response?: { status?: number } })?.response?.status === "number"
              ? { errorCode: `HTTP_${(error as { response: { status: number } }).response.status}` }
              : {}),
          circuitOpened,
        };
        logger.warn("Stellar RPC failover", { event: "rpc_failover", ...event });
        void RpcFailoverEvent.create(event).catch((auditError: unknown) => {
          logger.error("Failed to persist RPC failover event", {
            error: auditError instanceof Error ? auditError.message : String(auditError),
          });
        });
      }
    }

    throw new AppError(
      `All Stellar RPC endpoints failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      StatusCodes.BAD_GATEWAY,
      "RPC_ALL_ENDPOINTS_FAILED",
    );
  }

  private refreshHalfOpenStates(): void {
    const now = Date.now();
    for (const endpoint of this.endpoints) {
      if (endpoint.state === "open" && endpoint.retryAt && now >= endpoint.retryAt.getTime()) {
        endpoint.state = "half_open";
      }
    }
  }
}

class SorobanRpcTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`timed out after ${timeoutMs}ms`);
    this.name = "SorobanRpcTimeoutError";
  }
}

function isRpcErrorPayload(error: unknown): error is RpcErrorPayload {
  return (
    typeof error === "object" &&
    error !== null &&
    !(error instanceof Error) &&
    typeof (error as RpcErrorPayload).code === "number" &&
    typeof (error as RpcErrorPayload).message === "string"
  );
}

function isHttpTransportError(error: unknown): error is HttpTransportError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as HttpTransportError).isAxiosError === true
  );
}

export function defaultSorobanConfig(): SorobanServiceConfig {
  return {
    rpcUrl: env.STELLAR_RPC_URL,
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
    timeoutMs: (env.STELLAR_RPC_TIMEOUT_MS != null && Number.isFinite(env.STELLAR_RPC_TIMEOUT_MS as number)) ? (env.STELLAR_RPC_TIMEOUT_MS as number) : 30_000,
    // Plain-http RPC (local quickstart node) is never allowed in production
    allowHttp: env.NODE_ENV !== "production" && env.STELLAR_RPC_URL.startsWith("http://"),
  };
}

export class SorobanService {
  private readonly server: rpc.Server;
  private readonly timeoutMs: number;
  readonly networkPassphrase: string;

  constructor(config: SorobanServiceConfig = defaultSorobanConfig(), server?: rpc.Server) {
    if (!Number.isInteger(config.timeoutMs) || config.timeoutMs <= 0) {
      throw new Error(`[Config] STELLAR_RPC_TIMEOUT_MS must be a positive integer, got ${config.timeoutMs}`);
    }

    this.server = server ?? new rpc.Server(config.rpcUrl, { allowHttp: config.allowHttp });
    this.timeoutMs = config.timeoutMs;
    this.networkPassphrase = config.networkPassphrase;
  }

  /**
   * Load an account with its current sequence number, ready for
   * `TransactionBuilder`.
   */
  async loadAccount(publicKey: string): Promise<Account> {
    if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new AppError("Invalid Stellar account address", StatusCodes.BAD_REQUEST, "INVALID_STELLAR_ADDRESS");
    }

    try {
      return await this.call("loadAccount", () => this.server.getAccount(publicKey));
    } catch (error) {
      if (error instanceof AppError && error.statusCode === StatusCodes.NOT_FOUND) {
        throw new AppError(
          `Stellar account not found: ${publicKey}`,
          StatusCodes.NOT_FOUND,
          "STELLAR_ACCOUNT_NOT_FOUND"
        );
      }
      throw error;
    }
  }

  /** Fetch contract / system / diagnostic events. */
  async getEvents(request: rpc.Server.GetEventsRequest): Promise<rpc.Api.GetEventsResponse> {
    return this.call("getEvents", () => this.server.getEvents(request));
  }

  async getNetworkStatus(limit = 20): Promise<RpcNetworkStatus> {
    const [ledger, failovers] = await Promise.all([
      this.call("getLatestLedger", () => this.server.getLatestLedger()),
      RpcFailoverEvent.find().sort({ occurredAt: -1 }).limit(limit).lean().exec(),
    ]);
    return {
      activeEndpoint: redactEndpoint(env.STELLAR_RPC_URL),
      latestLedger: {
        sequence: ledger.sequence,
        protocolVersion: String(ledger.protocolVersion),
        id: ledger.id,
      },
      endpoints: (env.STELLAR_RPC_URLS ?? [env.STELLAR_RPC_URL]).map((url, index) => ({
        priority: index + 1,
        endpoint: redactEndpoint(url),
        state: "closed" as const,
        consecutiveFailures: 0,
      })),
      recentFailovers: failovers.map((event) => ({
        operation: event.operation,
        fromEndpoint: event.fromEndpoint,
        toEndpoint: event.toEndpoint,
        reason: event.reason,
        errorCode: event.errorCode,
        circuitOpened: event.circuitOpened,
        occurredAt: event.occurredAt,
      })),
    };
  }

  /**
   * Simulate a transaction. Simulation errors (contract traps, invalid
   * arguments) are raised as 422 so callers never submit a failing tx.
   */
  async simulate(transaction: SorobanTransaction): Promise<SimulationResult> {
    const response = await this.call("simulate", () => this.server.simulateTransaction(transaction));

    if (rpc.Api.isSimulationError(response)) {
      throw new AppError(
        `Soroban simulation failed: ${response.error}`,
        StatusCodes.UNPROCESSABLE_ENTITY,
        "SOROBAN_SIMULATION_FAILED"
      );
    }

    return response;
  }

  /**
   * Submit a signed transaction. Only PENDING and DUPLICATE are returned;
   * rejected submissions become 422 and back-pressure becomes 503.
   */
  async sendTransaction(transaction: SorobanTransaction): Promise<SubmittedTransaction> {
    const response = await this.call("sendTransaction", () => this.server.sendTransaction(transaction));

    switch (response.status) {
      case "PENDING":
      case "DUPLICATE":
        return response as SubmittedTransaction;

      case "TRY_AGAIN_LATER":
        throw new AppError(
          "Soroban RPC is congested; retry the submission later",
          StatusCodes.SERVICE_UNAVAILABLE,
          "SOROBAN_TRY_AGAIN_LATER"
        );

      case "ERROR": {
        const resultCode = response.errorResult?.result().switch().name ?? "unknown";
        throw new AppError(
          `Soroban transaction ${response.hash} rejected: ${resultCode}`,
          StatusCodes.UNPROCESSABLE_ENTITY,
          "SOROBAN_TRANSACTION_REJECTED"
        );
      }

      default: {
        const unexpected: never = response.status;
        throw new AppError(
          `Unexpected sendTransaction status: ${String(unexpected)}`,
          StatusCodes.BAD_GATEWAY,
          "SOROBAN_RPC_ERROR"
        );
      }
    }
  }

  /**
   * Look up a transaction by hash. NOT_FOUND is a normal status (not yet
   * ingested or outside retention) and is returned rather than thrown.
   */
  async getTransaction(hash: string): Promise<rpc.Api.GetTransactionResponse> {
    if (!TRANSACTION_HASH_PATTERN.test(hash)) {
      throw new AppError("Invalid transaction hash", StatusCodes.BAD_REQUEST, "INVALID_TRANSACTION_HASH");
    }

    return this.call("getTransaction", () => this.server.getTransaction(hash.toLowerCase()));
  }

  /** Run an RPC call with the configured timeout and map failures to AppError. */
  private async call<T>(operation: SorobanOperation, fn: () => Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new SorobanRpcTimeoutError(this.timeoutMs)), this.timeoutMs);
    });

    try {
      return await Promise.race([fn(), timeout]);
    } catch (error) {
      throw this.toAppError(operation, error);
    } finally {
      clearTimeout(timer);
    }
  }

  // -------------------------------------------------------------------------
  // Oracle-facing contract interaction methods
  // -------------------------------------------------------------------------

  /**
   * Builds, simulates, and signs a `provenance.mint` transaction.
   * The transaction is ready to be submitted but has NOT been sent yet.
   *
   * @throws TransactionSimulationError when the simulation rejects the call
   *   (e.g. a certificate already exists for this content).
   */
  async buildMintTransaction(
    keypair: Keypair,
    contractId: string,
    mintArgs: import("../utils/xdr").MintArgs
  ): Promise<import("../utils/transactionBuilder").SignedContractTransaction> {
    const { buildSignedContractTransaction } = await import("../utils/transactionBuilder");
    const { buildMintArgs } = await import("../utils/xdr");
    return buildSignedContractTransaction({
      client: this.server,
      keypair,
      networkPassphrase: this.networkPassphrase,
      call: {
        contractId,
        method: "mint",
        args: buildMintArgs(mintArgs),
      },
    });
  }

  /**
   * Submits a signed transaction to the Soroban RPC. Returns when the RPC
   * has accepted the submission (PENDING or DUPLICATE).
   *
   * @throws TransactionFailedError  when the RPC immediately rejects it.
   * @throws TransactionSubmissionError when the RPC asks for a retry later.
   */
  async submitTransaction(
    signed: import("../utils/transactionBuilder").SignedContractTransaction
  ): Promise<void> {
    const {
      TransactionFailedError: TxFailed,
      TransactionSubmissionError: TxSubmission,
    } = await import("../errors/SorobanTransactionError");

    const response = await this.call(
      "sendTransaction",
      () => this.server.sendTransaction(signed.transaction)
    );

    if (response.status === "TRY_AGAIN_LATER") {
      throw new TxSubmission(
        `Transaction ${signed.hash} deferred: RPC is congested`,
        signed.hash
      );
    }

    if (response.status === "ERROR") {
      const result = response.errorResult?.result();
      const resultCode = result?.switch().name ?? "unknown";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const operationResultCodes: string[] = (result?.results() as any[])
        ?.map((r: any) => r.tr?.()?.switch?.().name ?? "unknown") ?? [];
      throw new TxFailed({
        txHash: signed.hash,
        resultCode,
        operationResultCodes,
        diagnosticEventsXdr: [],
      });
    }
    // PENDING or DUPLICATE — submission accepted
  }

  /**
   * Polls `getTransaction` until the transaction reaches a final state.
   *
   * Resolves with a `SuccessfulTransactionStatus` when the transaction is
   * confirmed `SUCCESS`.
   *
   * @throws TransactionFailedError              when the transaction failed on-chain.
   * @throws TransactionConfirmationTimeoutError when the window expires.
   * @throws SorobanRpcError                     on persistent RPC failures.
   */
  async getTransactionWithConfirmation(
    txHash: string
  ): Promise<import("../types/soroban.types").SuccessfulTransactionStatus> {
    const {
      TransactionFailedError: TxFailed,
      TransactionConfirmationTimeoutError: TxTimeout,
      SorobanRpcError: RpcErr,
    } = await import("../errors/SorobanTransactionError");

    const timeoutMs = env.STELLAR_TX_CONFIRMATION_TIMEOUT_MS;
    const pollIntervalMs = env.STELLAR_TX_POLL_INTERVAL_MS;
    const maxConsecutiveRpcErrors = env.STELLAR_TX_MAX_CONSECUTIVE_RPC_ERRORS;

    const deadline = Date.now() + timeoutMs;
    let consecutiveRpcErrors = 0;
    let attempts = 0;

    while (Date.now() < deadline) {
      attempts += 1;
      let response: rpc.Api.GetTransactionResponse;
      try {
        response = await this.call("getTransaction", () => this.server.getTransaction(txHash));
        consecutiveRpcErrors = 0;
      } catch (err) {
        consecutiveRpcErrors += 1;
        if (consecutiveRpcErrors >= maxConsecutiveRpcErrors) {
          throw new RpcErr(
            `getTransaction failed ${consecutiveRpcErrors} times in a row: ${err instanceof Error ? err.message : String(err)}`,
            txHash
          );
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
        continue;
      }

      if (response.status === "SUCCESS") {
        const txMeta = response.resultMetaXdr;
        let returnValue: import("@stellar/stellar-sdk").xdr.ScVal | undefined;
        try {
          const sorobanMeta = txMeta.v3?.().sorobanMeta?.()?.returnValue?.();
          if (sorobanMeta) returnValue = sorobanMeta;
        } catch {
          // returnValue stays undefined; that is fine for non-invocation txs
        }
        return {
          status: "SUCCESS",
          txHash,
          ledger: response.ledger,
          createdAt: response.createdAt,
          returnValue,
        };
      }

      if (response.status === "FAILED") {
        throw new TxFailed({
          txHash,
          resultCode: "failed",
          operationResultCodes: [],
          diagnosticEventsXdr: [],
          ledger: response.ledger,
        });
      }

      // NOT_FOUND — not yet ingested; keep polling
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new TxTimeout(txHash, timeoutMs, attempts, consecutiveRpcErrors > 0);
  }
  private toAppError(operation: SorobanOperation, error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const prefix = `Soroban RPC ${operation} failed`;

    if (error instanceof SorobanRpcTimeoutError) {
      logger.warn(prefix, { operation, reason: error.message });
      return new AppError(`${prefix}: ${error.message}`, StatusCodes.GATEWAY_TIMEOUT, "SOROBAN_RPC_TIMEOUT");
    }

    if (isRpcErrorPayload(error)) {
      if (error.code === StatusCodes.NOT_FOUND) {
        return new AppError(`${prefix}: ${error.message}`, StatusCodes.NOT_FOUND, "SOROBAN_NOT_FOUND");
      }
      if (error.code === JSON_RPC_INVALID_PARAMS || error.code === JSON_RPC_INVALID_REQUEST) {
        return new AppError(`${prefix}: ${error.message}`, StatusCodes.BAD_REQUEST, "SOROBAN_INVALID_REQUEST");
      }
      logger.warn(prefix, { operation, rpcCode: error.code, reason: error.message });
      return new AppError(`${prefix}: ${error.message}`, StatusCodes.BAD_GATEWAY, "SOROBAN_RPC_ERROR");
    }

    if (isHttpTransportError(error)) {
      const status = error.response?.status;
      logger.warn(prefix, { operation, httpStatus: status, code: error.code, reason: error.message });

      if (status === StatusCodes.TOO_MANY_REQUESTS) {
        return new AppError(`${prefix}: rate limited`, StatusCodes.TOO_MANY_REQUESTS, "SOROBAN_RPC_RATE_LIMITED");
      }
      if (status === undefined) {
        const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
        return timedOut
          ? new AppError(`${prefix}: ${error.message}`, StatusCodes.GATEWAY_TIMEOUT, "SOROBAN_RPC_TIMEOUT")
          : new AppError(`${prefix}: ${error.message}`, StatusCodes.SERVICE_UNAVAILABLE, "SOROBAN_RPC_UNREACHABLE");
      }
      return new AppError(`${prefix}: HTTP ${status}`, StatusCodes.BAD_GATEWAY, "SOROBAN_RPC_UNAVAILABLE");
    }

    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(prefix, { operation, reason });
    return new AppError(`${prefix}: ${reason}`, StatusCodes.BAD_GATEWAY, "SOROBAN_RPC_ERROR");
  }
}

export const sorobanService = new SorobanService();



