import { act, renderHook, waitFor } from '@testing-library/react';
import { xdr } from '@stellar/stellar-sdk';
import {
  calculateBackoff,
  usePollContractEvents,
  type ContractEventSource,
  type PollContractEvent,
} from '../usePollContractEvents';

const EVENT: PollContractEvent = {
  id: 'event-1',
  ledger: 10,
  txHash: 'ab'.repeat(32),
  topic: [xdr.ScVal.scvSymbol('VerificationRequest')],
  value: xdr.ScVal.scvVoid(),
};

describe('polling backoff', () => {
  it('grows exponentially and stops at the cap', () => {
    expect([0, 1, 2, 3, 4].map((attempt) => calculateBackoff(attempt, 1_000, 8_000))).toEqual([
      1_000,
      2_000,
      4_000,
      8_000,
      8_000,
    ]);
  });

  it('polls with increasing delays until a matching event is found', async () => {
    jest.useFakeTimers();
    const eventSource = jest.fn() as jest.MockedFunction<ContractEventSource>;
    eventSource
      .mockResolvedValueOnce({ events: [], latestLedger: 10 })
      .mockResolvedValueOnce({ events: [], latestLedger: 11 })
      .mockResolvedValueOnce({ events: [EVENT], latestLedger: 12 });
    const matchEvent = (event: PollContractEvent) => event.id === EVENT.id;
    const { result } = renderHook(() =>
      usePollContractEvents({
        eventSource,
        matchEvent,
        initialIntervalMs: 100,
        maxIntervalMs: 400,
      })
    );

    await waitFor(() => expect(eventSource).toHaveBeenCalledTimes(1));
    expect(result.current.nextPollInMs).toBe(100);
    await act(async () => jest.advanceTimersByTimeAsync(100));
    await waitFor(() => expect(eventSource).toHaveBeenCalledTimes(2));
    expect(result.current.nextPollInMs).toBe(200);
    await act(async () => jest.advanceTimersByTimeAsync(200));
    await waitFor(() => expect(result.current.event?.id).toBe(EVENT.id));
    expect(result.current.isPolling).toBe(false);
    jest.useRealTimers();
  });

  it('surfaces source failures and retries from the initial interval', async () => {
    const eventSource = jest.fn() as jest.MockedFunction<ContractEventSource>;
    eventSource.mockRejectedValueOnce(new Error('Horizon unavailable')).mockResolvedValue({ events: [], latestLedger: 10 });
    const { result } = renderHook(() =>
      usePollContractEvents({ eventSource, matchEvent: () => false, initialIntervalMs: 60_000 })
    );

    await waitFor(() => expect(result.current.error).toBe('Horizon unavailable'));
    act(() => result.current.retry());
    await waitFor(() => expect(eventSource).toHaveBeenCalledTimes(2));
    expect(result.current.attempt).toBe(1);
  });
});
