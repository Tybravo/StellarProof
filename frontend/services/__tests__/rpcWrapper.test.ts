import {
  SOROBAN_RPC_URLS,
  RpcWrapperError,
  buildRpcRequest,
  getHealth,
  getLatestLedger,
  getSorobanRpcUrl,
  resetRequestId,
  simulateTransaction,
  sorobanRpcRequest,
} from "../rpcWrapper";

function mockResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("rpcWrapper", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    resetRequestId();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getSorobanRpcUrl", () => {
    it("returns the testnet Soroban RPC endpoint", () => {
      expect(getSorobanRpcUrl("testnet")).toBe(
        "https://soroban-testnet.stellar.org"
      );
    });

    it("returns the mainnet Soroban RPC endpoint", () => {
      expect(getSorobanRpcUrl("mainnet")).toBe(
        "https://soroban-mainnet.stellar.org"
      );
    });

    it("returns the futurenet Soroban RPC endpoint", () => {
      expect(getSorobanRpcUrl("futurenet")).toBe(
        "https://rpc-futurenet.stellar.org"
      );
    });

    it("exposes every supported network", () => {
      expect(Object.keys(SOROBAN_RPC_URLS)).toEqual([
        "mainnet",
        "testnet",
        "futurenet",
      ]);
    });

    it("throws a descriptive error for an unknown network", () => {
      expect(() => getSorobanRpcUrl("unknown")).toThrow(RpcWrapperError);
      expect(() => getSorobanRpcUrl("unknown")).toThrow(/unknown network/i);
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

    it("preserves method and params verbatim", () => {
      const request = buildRpcRequest("simulateTransaction", {
        transaction: "AAAA",
      });

      expect(request.method).toBe("simulateTransaction");
      expect(request.params).toEqual({ transaction: "AAAA" });
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
    it("formats the HTTP request sent to the Soroban RPC endpoint", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: { ok: true } })
      );

      await sorobanRpcRequest("getHealth", {}, "testnet");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://soroban-testnet.stellar.org",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getHealth",
            params: {},
          }),
          cache: "no-store",
        }
      );
    });

    it("sends to the mainnet endpoint when requested", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: null })
      );

      await sorobanRpcRequest("getLatestLedger", {}, "mainnet");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://soroban-mainnet.stellar.org",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("serializes params into the JSON body", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({ jsonrpc: "2.0", id: 1, result: {} })
      );

      await sorobanRpcRequest(
        "simulateTransaction",
        { transaction: "AAAA", nested: { a: 1 } },
        "testnet"
      );

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toEqual({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: { transaction: "AAAA", nested: { a: 1 } },
      });
    });

    it("unwraps the JSON-RPC result", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "healthy", latestLedger: 123 },
        })
      );

      const result = await sorobanRpcRequest("getHealth", {}, "testnet");

      expect(result).toEqual({ status: "healthy", latestLedger: 123 });
    });

    it("throws a typed error for JSON-RPC errors", async () => {
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

      await expect(
        sorobanRpcRequest("getHealth", {}, "testnet")
      ).rejects.toMatchObject({
        name: "RpcWrapperError",
        message: "Invalid Request",
        code: -32600,
        data: { detail: "bad params" },
      });
    });

    it("throws on a non-2xx HTTP response without parsing the body", async () => {
      const json = jest.fn();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json,
      } as unknown as Response);

      await expect(
        sorobanRpcRequest("getHealth", {}, "testnet")
      ).rejects.toMatchObject({
        name: "RpcWrapperError",
        message: "Soroban RPC request failed with status 503",
        status: 503,
      });
      expect(json).not.toHaveBeenCalled();
    });

    it("wraps network failures in RpcWrapperError", async () => {
      fetchMock.mockRejectedValue(new Error("Network unreachable"));

      await expect(
        sorobanRpcRequest("getHealth", {}, "testnet")
      ).rejects.toMatchObject({
        name: "RpcWrapperError",
        message: "Soroban RPC request failed: Network unreachable",
      });
    });

    it("wraps invalid JSON responses in RpcWrapperError", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      } as unknown as Response);

      await expect(
        sorobanRpcRequest("getHealth", {}, "testnet")
      ).rejects.toThrow("Soroban RPC returned an invalid JSON response");
    });

    it("rejects before fetching when the network is unknown", async () => {
      await expect(
        sorobanRpcRequest("getHealth", {}, "unknown")
      ).rejects.toThrow(RpcWrapperError);
      expect(fetchMock).not.toHaveBeenCalled();
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

      const ledger = await getLatestLedger("testnet");

      expect(ledger).toEqual({
        sequence: 999,
        id: "abc",
        protocolVersion: 22,
      });

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toMatchObject({
        method: "getLatestLedger",
        params: {},
      });
    });

    it("getHealth calls the getHealth method", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "healthy" },
        })
      );

      await expect(getHealth("testnet")).resolves.toEqual({
        status: "healthy",
      });

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toMatchObject({
        method: "getHealth",
        params: {},
      });
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

      const result = await simulateTransaction("AAAA", "testnet");

      expect(result).toEqual({
        transactionData: "AAAA",
        minResourceFee: "100",
        latestLedger: 555,
      });

      const [, init] = fetchMock.mock.calls[0];
      expect(JSON.parse(init.body)).toMatchObject({
        method: "simulateTransaction",
        params: { transaction: "AAAA" },
      });
    });

    it("surfaces simulation errors to the caller", async () => {
      fetchMock.mockResolvedValue(
        mockResponse({
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32000, message: "HostError: contract trap" },
        })
      );

      await expect(simulateTransaction("AAAA", "testnet")).rejects.toMatchObject(
        {
          name: "RpcWrapperError",
          code: -32000,
          message: "HostError: contract trap",
        }
      );
    });
  });
});
