import {
  DEFAULT_RPC_TIMEOUT_MS,
  RpcWrapperError,
  SOROBAN_RPC_URLS,
  buildRpcRequest,
  getAccount,
  getEvents,
  getHealth,
  getLatestLedger,
  getSorobanRpcUrl,
  resetRequestId,
  simulateTransaction,
  sorobanRpcRequest,
} from "../rpcWrapper";

const ENV_KEYS = [
  "NEXT_PUBLIC_STELLAR_RPC_URL",
  "STELLAR_RPC_URL",
  "NEXT_PUBLIC_STELLAR_NETWORK",
] as const;

function mockResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {}
) {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

function sentBody(fetchMock: jest.Mock, call = 0): Record<string, unknown> {
  const [, init] = fetchMock.mock.calls[call] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe("rpcWrapper", () => {
  const originalEnv: Record<string, string | undefined> = {};
  let fetchMock: jest.Mock;

  beforeAll(() => {
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    resetRequestId();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("endpoint resolution", () => {
    it("uses the public endpoint for each network by default", () => {
      expect(getSorobanRpcUrl("testnet")).toBe(SOROBAN_RPC_URLS.testnet);
      expect(getSorobanRpcUrl("mainnet")).toBe(SOROBAN_RPC_URLS.mainnet);
      expect(getSorobanRpcUrl("futurenet")).toBe(SOROBAN_RPC_URLS.futurenet);
    });

    it("defaults to the configured expected network", () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = "mainnet";
      expect(getSorobanRpcUrl()).toBe(SOROBAN_RPC_URLS.mainnet);
    });

    it("prefers NEXT_PUBLIC_STELLAR_RPC_URL and strips trailing slashes", () => {
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL =
        "https://rpc.example.org/stellar/";
      expect(getSorobanRpcUrl("mainnet")).toBe(
        "https://rpc.example.org/stellar"
      );
    });

    it("honours the backend-style STELLAR_RPC_URL variable", () => {
      process.env.STELLAR_RPC_URL = "http://localhost:8000/soroban/rpc";
      expect(getSorobanRpcUrl()).toBe("http://localhost:8000/soroban/rpc");
    });

    it("rejects an invalid configured URL instead of silently falling back", () => {
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "not-a-url";
      expect(() => getSorobanRpcUrl()).toThrow(RpcWrapperError);
      expect(() => getSorobanRpcUrl()).toThrow(/absolute HTTP\(S\) URL/);
    });

    it("rejects a non-HTTP configured URL", () => {
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "ftp://rpc.example.org";
      expect(() => getSorobanRpcUrl()).toThrow(/http: or https:/);
    });

    it("rejects an unknown network when no endpoint is configured", () => {
      expect(() => getSorobanRpcUrl("unknown")).toThrow(/unknown network/i);
    });

    it("lets callers override the endpoint explicitly", async () => {
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://env.example.org";
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: { status: "healthy" } })
      );

      await getHealth({ rpcUrl: "https://override.example.org/" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://override.example.org",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("buildRpcRequest", () => {
    it("builds a JSON-RPC 2.0 envelope", () => {
      expect(buildRpcRequest("getHealth", {})).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
        params: {},
      });
    });

    it("defaults params to an empty object", () => {
      expect(buildRpcRequest("getLatestLedger").params).toEqual({});
    });

    it("uses an explicit id when one is provided", () => {
      expect(buildRpcRequest("getHealth", {}, 42).id).toBe(42);
    });

    it("increments ids across calls and resets on demand", () => {
      expect(buildRpcRequest("getHealth").id).toBe(1);
      expect(buildRpcRequest("getHealth").id).toBe(2);

      resetRequestId();

      expect(buildRpcRequest("getHealth").id).toBe(1);
    });
  });

  describe("sorobanRpcRequest", () => {
    it("posts the JSON-RPC envelope to the configured endpoint", async () => {
      process.env.NEXT_PUBLIC_STELLAR_RPC_URL = "https://rpc.example.org";
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: { ok: true } })
      );

      await sorobanRpcRequest("getHealth", {}, { network: "testnet" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith("https://rpc.example.org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getHealth",
          params: {},
        }),
        cache: "no-store",
        signal: expect.any(AbortSignal),
      });
    });

    it("falls back to the network default endpoint", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: {} })
      );

      await sorobanRpcRequest("getHealth", {}, { network: "mainnet" });

      expect(fetchMock).toHaveBeenCalledWith(
        SOROBAN_RPC_URLS.mainnet,
        expect.objectContaining({ method: "POST" })
      );
    });

    it("unwraps the JSON-RPC result", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "healthy", latestLedger: 123 },
        })
      );

      await expect(getHealth({ network: "testnet" })).resolves.toEqual({
        status: "healthy",
        latestLedger: 123,
      });
    });

    it("throws a typed HTTP error without parsing the body", async () => {
      const json = jest.fn();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json,
      } as unknown as Response);

      await expect(getHealth({ network: "testnet" })).rejects.toMatchObject({
        name: "RpcWrapperError",
        kind: "http",
        status: 503,
        message: "Soroban RPC request failed with status 503.",
      });
      expect(json).not.toHaveBeenCalled();
    });

    it("throws a typed JSON-RPC error", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          error: {
            code: -32600,
            message: "Invalid Request",
            data: { detail: "bad params" },
          },
        })
      );

      await expect(getHealth({ network: "testnet" })).rejects.toMatchObject({
        name: "RpcWrapperError",
        kind: "rpc",
        code: -32600,
        message: "Invalid Request",
        data: { detail: "bad params" },
      });
    });

    it("wraps network failures", async () => {
      fetchMock.mockRejectedValue(new Error("Network unreachable"));

      await expect(getHealth({ network: "testnet" })).rejects.toMatchObject({
        kind: "network",
        message: "Soroban RPC request failed: Network unreachable",
      });
    });

    it("rejects invalid JSON responses", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      } as unknown as Response);

      await expect(getHealth({ network: "testnet" })).rejects.toMatchObject({
        kind: "invalid-response",
      });
    });

    it("rejects responses without a result", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1 })
      );

      await expect(getHealth({ network: "testnet" })).rejects.toMatchObject({
        kind: "invalid-response",
        message: /did not include a result/,
      });
    });

    it("does not fetch when the caller signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        getHealth({ signal: controller.signal })
      ).rejects.toMatchObject({ kind: "aborted" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("stops an in-flight request when the caller aborts", async () => {
      const controller = new AbortController();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new Error("Aborted"))
            );
          })
      );

      const pending = getHealth({ signal: controller.signal });
      controller.abort();

      await expect(pending).rejects.toMatchObject({ kind: "aborted" });
    });

    it("aborts requests that exceed the timeout", async () => {
      jest.useFakeTimers();
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new Error("Aborted"))
            );
          })
      );

      const pending = getHealth({ timeoutMs: 500 });
      jest.advanceTimersByTime(500);

      await expect(pending).rejects.toMatchObject({
        kind: "timeout",
        message: "Soroban RPC request timed out after 500ms.",
      });
    });

    it("exposes a default timeout", () => {
      expect(DEFAULT_RPC_TIMEOUT_MS).toBeGreaterThan(0);
    });
  });

  describe("convenience calls", () => {
    it("getLatestLedger calls the getLatestLedger method", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { sequence: 999, id: "abc", protocolVersion: 22 },
        })
      );

      await expect(getLatestLedger({ network: "testnet" })).resolves.toEqual({
        sequence: 999,
        id: "abc",
        protocolVersion: 22,
      });
      expect(sentBody(fetchMock)).toMatchObject({
        method: "getLatestLedger",
        params: {},
      });
    });

    it("getAccount sends the address and returns the account", async () => {
      const account = {
        id: "GACCOUNT",
        sequence: "123456",
        balances: [{ asset_type: "native", balance: "10.0000000" }],
      };
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: account })
      );

      await expect(
        getAccount("  GACCOUNT  ", { network: "testnet" })
      ).resolves.toEqual(account);
      expect(sentBody(fetchMock)).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccount",
        params: { address: "GACCOUNT" },
      });
    });

    it("getAccount rejects an empty address before fetching", async () => {
      await expect(getAccount("   ")).rejects.toMatchObject({
        kind: "config",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("getEvents sends the ledger range and filters", async () => {
      const result = {
        events: [
          {
            type: "contract",
            ledger: 42,
            ledgerClosedAt: "2026-01-01T00:00:00Z",
            contractId: "C123",
            id: "event-1",
            pagingToken: "token-1",
            topic: ["AAAA"],
            value: "BBBB",
            inSuccessfulContractCall: true,
            txHash: "deadbeef",
          },
        ],
        latestLedger: 100,
      };
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result })
      );

      const params = {
        startLedger: 40,
        endLedger: 50,
        filters: [{ type: "contract" as const, contractIds: ["C123"] }],
        limit: 10,
      };

      await expect(getEvents(params, { network: "testnet" })).resolves.toEqual(
        result
      );
      expect(sentBody(fetchMock).params).toEqual(params);
    });

    it("getEvents supports cursor pagination", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { events: [], latestLedger: 100, cursor: "next" },
        })
      );

      await getEvents({ cursor: "next" });

      expect(sentBody(fetchMock).params).toEqual({ cursor: "next" });
    });

    it("getEvents rejects ambiguous or missing pagination", async () => {
      await expect(getEvents({})).rejects.toMatchObject({ kind: "config" });
      await expect(
        getEvents({ startLedger: 1, cursor: "next" })
      ).rejects.toMatchObject({ kind: "config" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("simulateTransaction sends the transaction XDR", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          result: {
            transactionData: "AAAA",
            minResourceFee: "100",
            latestLedger: 555,
          },
        })
      );

      await expect(
        simulateTransaction("AAAA", { network: "testnet" })
      ).resolves.toMatchObject({ transactionData: "AAAA" });
      expect(sentBody(fetchMock).params).toEqual({ transaction: "AAAA" });
    });
  });
});
