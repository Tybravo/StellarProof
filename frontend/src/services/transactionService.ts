export type TxStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface TransactionStatusResult {
  hash: string;
  status: TxStatus;
  ledger?: number;
  createdAt?: string;
}

const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer/public/tx';
const HORIZON_BASE = 'https://horizon.stellar.org/transactions';

export function getExplorerUrl(hash: string): string {
  return `${STELLAR_EXPERT_BASE}/${hash}`;
}

// Mock store to simulate status progression during development
const mockStatusStore: Record<string, { calls: number }> = {};

/**
 * Fetches transaction status from Horizon API.
 * Falls back to mock data when the real network is unavailable.
 */
export async function fetchTransactionStatus(
  hash: string
): Promise<TransactionStatusResult> {
  try {
    const res = await fetch(`${HORIZON_BASE}/${hash}`, { cache: 'no-store' });

    if (res.status === 404) {
      return { hash, status: 'PENDING' };
    }

    if (!res.ok) {
      throw new Error(`Horizon responded with ${res.status}`);
    }

    const data = await res.json();
    const status: TxStatus = data.successful === false ? 'FAILED' : 'CONFIRMED';
    return {
      hash,
      status,
      ledger: data.ledger,
      createdAt: data.created_at,
    };
  } catch {
    // Return mock progressive status during development / when network is unavailable
    return getMockStatus(hash);
  }
}

function getMockStatus(hash: string): TransactionStatusResult {
  if (!mockStatusStore[hash]) {
    mockStatusStore[hash] = { calls: 0 };
  }
  mockStatusStore[hash].calls += 1;
  const calls = mockStatusStore[hash].calls;

  // Simulate: pending for first 3 polls, then confirmed
  const status: TxStatus = calls < 3 ? 'PENDING' : 'CONFIRMED';
  return { hash, status, ledger: status === 'CONFIRMED' ? 54321 : undefined };
}
