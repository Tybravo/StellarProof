import { act, renderHook, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import { usePollContractEvents, decodeVerificationRequestEvent } from '../usePollContractEvents';
import { useSpvUpdates } from '../useSpvUpdates';
import { VerificationProgress } from '../../features/verification/components/VerificationProgress';
import { rpc, xdr } from '@stellar/stellar-sdk';

jest.mock('@stellar/stellar-sdk', () => ({
  scValToNative: (value: unknown) => value,
  StrKey: { isValidEd25519PublicKey: (key: string) => key === 'GREQUESTER' },
}));

const payload = { mediaCid: 'bafy-media', manifestCid: 'bafy-manifest', requester: 'GREQUESTER' };
const event = { pagingToken: '1', txHash: 'submitted', inSuccessfulContractCall: true,
  topic: ['VerificationRequestEvent'], value: payload };
function options(getEvents = jest.fn().mockResolvedValue({ events: [event] })) {
  return { server: { getEvents } as Pick<rpc.Server, 'getEvents'>, contractId: 'contract',
    transactionHash: 'submitted', startLedger: 100, ...payload, intervalMs: 10, timeoutMs: 100 };
}

test('finds the submitted event and exposes matching CIDs', async () => {
  const config = options();
  const { result } = renderHook(() => usePollContractEvents(config));
  await waitFor(() => expect(result.current.event).toEqual(payload));
  expect(result.current.isLoading).toBe(false);
});

test('rejects registered CIDs that differ from the upload', async () => {
  const config = options(jest.fn().mockResolvedValue({ events: [{ ...event, value: { ...payload, mediaCid: 'other' } }] }));
  const { result } = renderHook(() => usePollContractEvents(config));
  await waitFor(() => expect(result.current.error?.message).toMatch(/differs/));
  expect(result.current.event).toBeNull();
});

test('ignores events from other transactions and times out', async () => {
  const config = options(jest.fn().mockResolvedValue({ events: [{ ...event, txHash: 'another' }] }));
  const { result } = renderHook(() => usePollContractEvents(config));
  await waitFor(() => expect(result.current.error?.message).toMatch(/Timed out/));
  expect(result.current.event).toBeNull();
});

test('surfaces RPC failure', async () => {
  const config = options(jest.fn().mockRejectedValue(new Error('RPC unavailable')));
  const { result } = renderHook(() => usePollContractEvents(config));
  await waitFor(() => expect(result.current.error?.message).toBe('RPC unavailable'));
});

test('rejects malformed event payloads', () => {
  expect(() => decodeVerificationRequestEvent({ ...payload, requester: 'invalid' } as unknown as xdr.ScVal)).toThrow();
});

class MockSource {
  static CLOSED = 2;
  static latest: MockSource;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close = jest.fn();
  addEventListener = jest.fn();
  constructor() { MockSource.latest = this; }
}

beforeEach(() => { Object.defineProperty(global, 'EventSource', { value: MockSource, configurable: true }); });

test('receives live statuses and closes at completion', () => {
  const { result, unmount } = renderHook(() => useSpvUpdates('/job/stream'));
  act(() => MockSource.latest.onmessage?.(new MessageEvent('message', { data: '{"status":"processing"}' })));
  expect(result.current.update?.status).toBe('processing');
  act(() => MockSource.latest.onmessage?.(new MessageEvent('message', { data: '{"status":"completed"}' })));
  expect(result.current.connection).toBe('closed');
  expect(MockSource.latest.close).toHaveBeenCalled();
  unmount();
});

test('shows loading and worker failure in the dashboard', () => {
  render(<VerificationProgress streamUrl="/job/stream" />);
  expect(screen.getByRole('status')).toHaveTextContent('Verification in progress');
  act(() => MockSource.latest.onmessage?.(new MessageEvent('message', { data: '{"status":"failed"}' })));
  expect(screen.getByRole('alert')).toHaveTextContent('Processing failed');
  expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'false');
});

test('reports malformed messages and stream interruptions', () => {
  const { result } = renderHook(() => useSpvUpdates('/job/stream'));
  act(() => MockSource.latest.onmessage?.(new MessageEvent('message', { data: '{}' })));
  expect(result.current.error?.message).toMatch(/Invalid/);
  act(() => MockSource.latest.onerror?.());
  expect(result.current.connection).toBe('reconnecting');
});
