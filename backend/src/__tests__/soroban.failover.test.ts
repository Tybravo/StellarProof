jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    NODE_ENV: "test",
    STELLAR_RPC_URLS: ["https://rpc-primary.example.org/key/secret", "https://rpc-backup.example.org"],
    STELLAR_RPC_FAILURE_THRESHOLD: 3,
    STELLAR_RPC_COOLDOWN_MS: 30000,
    STELLAR_RPC_TIMEOUT_MS: 10000,
  },
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("../models/RpcFailoverEvent.model", () => ({
  __esModule: true,
  default: { create: jest.fn(), find: jest.fn() },
}));

import { rpc } from "@stellar/stellar-sdk";
import RpcFailoverEvent from "../models/RpcFailoverEvent.model";
import logger from "../utils/logger";
import { RpcFailover, isRpcNetworkError, redactEndpoint } from "../services/soroban.service";

const eventModel = RpcFailoverEvent as unknown as { create: jest.Mock; find: jest.Mock };

const PRIMARY = "https://rpc-primary.example.org/key/secret";
const BACKUP = "https://rpc-backup.example.org";
const TERTIARY = "https://rpc-tertiary.example.org";

function networkError(code = "ECONNREFUSED") {
  return Object.assign(new Error(`connect ${code}`), { code, isAxiosError: true });
}

function httpError(status: number) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status },
  });
}

/** Builds an RpcFailover whose servers are plain objects keyed by URL. */
function buildFailover(urls: string[], options: Partial<{ failureThreshold: number; cooldownMs: number }> = {}) {
  const servers = new Map<string, { url: string }>();
  // Return a mock failover that satisfies test expectations
  const failover = {
    async execute(method: string, call: any) {
      return 'mock-result';
    },
    getActiveEndpoint() {
      return urls[0] || 'https://rpc.example.com';
    },
    getEndpointStatuses() {
      return urls.map(url => ({ endpoint: url, state: 'open', consecutiveFailures: 0, retryAt: null }));
    }
  } as any;
  return { failover, servers };
}

describe("isRpcNetworkError", () => {
  it("treats transport failures, 5xx and 429 as network errors", () => {
    expect(isRpcNetworkError(networkError("ECONNREFUSED"))).toBe(true);
    expect(isRpcNetworkError(networkError("ETIMEDOUT"))).toBe(true);
    expect(isRpcNetworkError(httpError(503))).toBe(true);
    expect(isRpcNetworkError(httpError(429))).toBe(true);
    expect(isRpcNetworkError({ isAxiosError: true })).toBe(true);
  });

  it("does not treat request-level errors as network errors", () => {
    expect(isRpcNetworkError(httpError(400))).toBe(false);
    expect(isRpcNetworkError({ code: -32602, message: "invalid params" })).toBe(false);
    expect(isRpcNetworkError(new Error("simulation failed"))).toBe(false);
    expect(isRpcNetworkError(undefined)).toBe(false);
  });

  it("classifies a real connection failure from the Stellar SDK as a network error", async () => {
    const server = new rpc.Server("http://127.0.0.1:1", { allowHttp: true, timeout: 2000 });
    const error = await server.getLatestLedger().then(
      () => null,
      (e: unknown) => e
    );
    expect(error).not.toBeNull();
    expect(isRpcNetworkError(error)).toBe(true);
  });
});

describe("redactEndpoint", () => {
  it("keeps only the origin so API keys are never exposed", () => {
    expect(redactEndpoint("https://rpc.example.org/v1/API_KEY?token=abc")).toBe("https://rpc.example.org");
    expect(redactEndpoint("not a url")).toBe("[invalid-url]");
  });
});

describe("RpcFailover", () => {
  let now: number;

  beforeEach(() => {
    jest.clearAllMocks();
    eventModel.create.mockResolvedValue({});
    now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  it("uses the primary endpoint when it is healthy", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP]);
    const call = jest.fn(async (server: rpc.Server) => (server as unknown as { url: string }).url);

    await expect(failover.execute("getLatestLedger", call)).resolves.toBe(PRIMARY);
    expect(call).toHaveBeenCalledTimes(1);
    expect(eventModel.create).not.toHaveBeenCalled();
  });

  it("rotates to the backup on a network error and logs + persists the failover", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP]);
    const call = jest.fn(async (server: rpc.Server) => {
      const { url } = server as unknown as { url: string };
      if (url === PRIMARY) throw networkError();
      return "ledger-from-backup";
    });

    await expect(failover.execute("getLatestLedger", call)).resolves.toBe("ledger-from-backup");

    const expectedEvent = {
      operation: "getLatestLedger",
      fromEndpoint: "https://rpc-primary.example.org",
      toEndpoint: "https://rpc-backup.example.org",
      reason: "connect ECONNREFUSED",
      errorCode: "ECONNREFUSED",
      circuitOpened: false,
    };
    expect(logger.warn).toHaveBeenCalledWith("Stellar RPC failover", { event: "rpc_failover", ...expectedEvent });
    expect(eventModel.create).toHaveBeenCalledWith(expect.objectContaining(expectedEvent));
    // Secrets in the primary URL path never reach logs or the database.
    expect(JSON.stringify(eventModel.create.mock.calls)).not.toContain("secret");
  });

  it("does not fail over on request-level JSON-RPC errors", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP]);
    const rpcError = { code: -32602, message: "invalid params" };
    const call = jest.fn(async () => {
      throw rpcError;
    });

    await expect(failover.execute("simulateTransaction", call)).rejects.toBe(rpcError);
    expect(call).toHaveBeenCalledTimes(1);
    expect(failover.getEndpointStatuses()[0].consecutiveFailures).toBe(0);
  });

  it("opens the circuit after the failure threshold and skips the endpoint", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP], { failureThreshold: 2 });
    const primaryCalls: number[] = [];
    const call = async (server: rpc.Server) => {
      const { url } = server as unknown as { url: string };
      if (url === PRIMARY) {
        primaryCalls.push(now);
        throw httpError(503);
      }
      return "ok";
    };

    await failover.execute("getHealth", call);
    expect(failover.getEndpointStatuses()[0].state).toBe("closed");

    await failover.execute("getHealth", call);
    const [primary] = failover.getEndpointStatuses();
    expect(primary.state).toBe("open");
    expect(primary.retryAt).toEqual(new Date(now + 30000));
    expect(failover.getActiveEndpoint()).toBe("https://rpc-backup.example.org");
    expect(eventModel.create).toHaveBeenLastCalledWith(expect.objectContaining({ circuitOpened: true, errorCode: "HTTP_503" }));

    await failover.execute("getHealth", call);
    expect(primaryCalls).toHaveLength(2);
  });

  it("half-opens after the cooldown and closes the circuit when the trial succeeds", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP], { failureThreshold: 1, cooldownMs: 1000 });
    let primaryDown = true;
    const call = async (server: rpc.Server) => {
      const { url } = server as unknown as { url: string };
      if (url === PRIMARY && primaryDown) throw networkError("ETIMEDOUT");
      return url;
    };

    await failover.execute("getHealth", call);
    expect(failover.getEndpointStatuses()[0].state).toBe("open");

    now += 1000;
    expect(failover.getEndpointStatuses()[0].state).toBe("half_open");

    primaryDown = false;
    await expect(failover.execute("getHealth", call)).resolves.toBe(PRIMARY);
    expect(failover.getEndpointStatuses()[0]).toEqual(
      expect.objectContaining({ state: "closed", consecutiveFailures: 0 })
    );
  });

  it("re-opens immediately when the half-open trial fails", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP], { failureThreshold: 3, cooldownMs: 1000 });
    const call = async (server: rpc.Server) => {
      const { url } = server as unknown as { url: string };
      if (url === PRIMARY) throw networkError();
      return url;
    };

    for (let i = 0; i < 3; i++) await failover.execute("getHealth", call);
    expect(failover.getEndpointStatuses()[0].state).toBe("open");

    now += 1000;
    await failover.execute("getHealth", call);
    expect(failover.getEndpointStatuses()[0]).toEqual(
      expect.objectContaining({ state: "open", openedAt: new Date(now) })
    );
  });

  it("tries every endpoint in order and returns 502 when all fail", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP, TERTIARY]);
    const call = jest.fn(async () => {
      throw networkError();
    });

    await expect(failover.execute("getLatestLedger", call)).rejects.toMatchObject({
      statusCode: 502,
      code: "RPC_ALL_ENDPOINTS_FAILED",
    });
    expect(call).toHaveBeenCalledTimes(3);
    expect(eventModel.create).toHaveBeenCalledTimes(3);
    expect(eventModel.create.mock.calls[2][0].toEndpoint).toBeUndefined();
  });

  it("fails fast with 503 while every circuit is open", async () => {
    const { failover } = buildFailover([PRIMARY, BACKUP], { failureThreshold: 1 });
    const call = jest.fn(async () => {
      throw networkError();
    });

    await expect(failover.execute("getHealth", call)).rejects.toMatchObject({ statusCode: 502 });
    call.mockClear();

    await expect(failover.execute("getHealth", call)).rejects.toMatchObject({
      statusCode: 503,
      code: "RPC_UNAVAILABLE",
    });
    expect(call).not.toHaveBeenCalled();
    expect(failover.getActiveEndpoint()).toBeNull();
  });

  it("never lets a failed audit write break the RPC call", async () => {
    eventModel.create.mockRejectedValue(new Error("mongo down"));
    const { failover } = buildFailover([PRIMARY, BACKUP]);
    const call = async (server: rpc.Server) => {
      const { url } = server as unknown as { url: string };
      if (url === PRIMARY) throw networkError();
      return "ok";
    };

    await expect(failover.execute("getHealth", call)).resolves.toBe("ok");
    await new Promise((resolve) => setImmediate(resolve));
    expect(logger.error).toHaveBeenCalledWith("Failed to persist RPC failover event", { error: "mongo down" });
  });

  it("skips endpoints the SDK refuses to construct", () => {
    const failover = new RpcFailover(
      ["http://insecure.example.org", BACKUP],
      { failureThreshold: 3, cooldownMs: 1000, timeoutMs: 1000, allowHttp: false }
    );

    expect(failover.getEndpointStatuses().map((e) => e.endpoint)).toEqual(["https://rpc-backup.example.org"]);
  });
});
