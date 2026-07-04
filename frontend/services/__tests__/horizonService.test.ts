import {
  fetchXlmBalance,
  fetchRecentTransactions,
  fundTestnetAccount,
} from "../horizonService";

const TEST_KEY = "GBXXYYYYZZZZ";

describe("horizonService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("fetchXlmBalance", () => {
    it("returns mock balance when key is mock key starting with GAAA", async () => {
      const balance = await fetchXlmBalance("GAAABBBCCCDDD", "testnet");
      expect(balance).toBe("10000.0000");
    });

    it("fetches native balance from Horizon", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          balances: [
            { asset_type: "native", balance: "150.1234567" },
            { asset_type: "credit_alphanum4", balance: "10" },
          ],
        }),
      }) as jest.Mock;

      const balance = await fetchXlmBalance(TEST_KEY, "testnet");
      expect(balance).toBe("150.1235"); // Parsed and formatted to 4 decimals
      expect(global.fetch).toHaveBeenCalledWith(
        `https://horizon-testnet.stellar.org/accounts/${TEST_KEY}`,
        expect.any(Object)
      );
    });

    it("returns 0.0000 if account is not found (404)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as jest.Mock;

      const balance = await fetchXlmBalance(TEST_KEY, "testnet");
      expect(balance).toBe("0.0000");
    });

    it("falls back to mock if network request fails", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network failure"));

      const balance = await fetchXlmBalance(TEST_KEY, "testnet");
      expect(balance).toBe("10000.0000");
    });
  });

  describe("fetchRecentTransactions", () => {
    it("returns mock transactions in mock mode", async () => {
      const txs = await fetchRecentTransactions("GAAABBBCCCDDD", "testnet");
      expect(txs.length).toBe(5);
      expect(txs[0].hash).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001");
    });

    it("fetches and maps transaction history from Horizon", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: {
            records: [
              {
                hash: "txhash123",
                created_at: "2026-06-26T21:40:00Z",
                ledger: 500,
                successful: true,
                fee_charged: "100",
                memo_type: "text",
                memo: "Test Memo",
              },
            ],
          },
        }),
      }) as jest.Mock;

      const txs = await fetchRecentTransactions(TEST_KEY, "testnet");
      expect(txs).toHaveLength(1);
      expect(txs[0]).toEqual({
        hash: "txhash123",
        createdAt: "2026-06-26T21:40:00Z",
        ledger: 500,
        successful: true,
        fee: "100",
        memo: "Test Memo",
      });
    });

    it("returns empty array if transactions 404 or error", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as jest.Mock;

      const txs = await fetchRecentTransactions(TEST_KEY, "testnet");
      expect(txs).toEqual([]);
    });
  });

  describe("fundTestnetAccount", () => {
    it("returns true in mock mode", async () => {
      const success = await fundTestnetAccount("GAAABBBCCCDDD");
      expect(success).toBe(true);
    });

    it("calls Friendbot endpoint and returns status", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      }) as jest.Mock;

      const success = await fundTestnetAccount(TEST_KEY);
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `https://friendbot.stellar.org/?addr=${TEST_KEY}`
      );
    });

    it("returns false if Friendbot fails", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
      }) as jest.Mock;

      const success = await fundTestnetAccount(TEST_KEY);
      expect(success).toBe(false);
    });
  });
});
