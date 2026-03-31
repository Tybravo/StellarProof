import { fetchTransactionStatus, getExplorerUrl } from '../transactionService';

const VALID_HASH = 'a'.repeat(64);

describe('transactionService', () => {
  describe('getExplorerUrl', () => {
    it('returns the stellar.expert explorer URL', () => {
      expect(getExplorerUrl(VALID_HASH)).toBe(
        `https://stellar.expert/explorer/public/tx/${VALID_HASH}`
      );
    });
  });

  describe('fetchTransactionStatus', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('returns CONFIRMED when Horizon responds with successful=true', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ successful: true, ledger: 100, created_at: '2026-01-01' }),
      }) as jest.Mock;

      const result = await fetchTransactionStatus(VALID_HASH);
      expect(result.status).toBe('CONFIRMED');
      expect(result.ledger).toBe(100);
    });

    it('returns FAILED when Horizon responds with successful=false', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ successful: false }),
      }) as jest.Mock;

      const result = await fetchTransactionStatus(VALID_HASH);
      expect(result.status).toBe('FAILED');
    });

    it('returns PENDING when Horizon returns 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }) as jest.Mock;

      const result = await fetchTransactionStatus(VALID_HASH);
      expect(result.status).toBe('PENDING');
    });

    it('falls back to mock data on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await fetchTransactionStatus('mockfallback' + 'b'.repeat(55));
      expect(['PENDING', 'CONFIRMED', 'FAILED']).toContain(result.status);
    });
  });
});
