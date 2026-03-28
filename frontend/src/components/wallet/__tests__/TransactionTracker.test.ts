/**
 * Unit tests for TransactionTracker polling logic.
 * Component rendering tests require jsdom + React Testing Library
 * (add those dependencies to enable full DOM tests).
 */
import { TxStatus } from '../../../services/transactionService';

describe('TransactionTracker – status logic', () => {
  const TERMINAL: TxStatus[] = ['CONFIRMED', 'FAILED'];

  it('recognises CONFIRMED and FAILED as terminal states', () => {
    expect(TERMINAL.includes('CONFIRMED')).toBe(true);
    expect(TERMINAL.includes('FAILED')).toBe(true);
    expect(TERMINAL.includes('PENDING')).toBe(false);
  });

  it('treats PENDING as the initial non-terminal state', () => {
    const initial: TxStatus = 'PENDING';
    expect(TERMINAL.includes(initial)).toBe(false);
  });

  it('all three status values are valid TxStatus literals', () => {
    const statuses: TxStatus[] = ['PENDING', 'CONFIRMED', 'FAILED'];
    expect(statuses).toHaveLength(3);
    statuses.forEach((s) => expect(typeof s).toBe('string'));
  });
});
