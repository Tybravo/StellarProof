import { act, renderHook, waitFor } from '@testing-library/react';
import { xdr } from '@stellar/stellar-sdk';
import { usePollAttestation, type AttestationEventSource, type ContractEvent } from '../usePollAttestation';
import { useWizardStore } from '@/features/verification/store/wizard.store';

function event(topic: string, requestId = '42'): ContractEvent {
  return {
    id: `${topic}-event`,
    ledger: 100,
    txHash: topic === 'Attested' ? 'bb'.repeat(32) : 'aa'.repeat(32),
    topic: [xdr.ScVal.scvSymbol(topic)],
    value: xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('request_id'),
        val: xdr.ScVal.scvU64(new xdr.Uint64(BigInt(requestId))),
      }),
    ]),
  };
}

describe('usePollAttestation', () => {
  beforeEach(() => {
    jest.useRealTimers();
    useWizardStore.getState().resetWizard();
  });

  it('moves the wizard to Processing and then Attested for the matching request', async () => {
    const eventSource = jest.fn() as jest.MockedFunction<AttestationEventSource>;
    eventSource
      .mockResolvedValueOnce({ events: [event('VerificationRequest')], latestLedger: 100 })
      .mockResolvedValueOnce({ events: [event('Attested')], latestLedger: 101 });
    const { result } = renderHook(() =>
      usePollAttestation({ requestId: '42', intervalMs: 1, eventSource })
    );

    await waitFor(() => expect(useWizardStore.getState().verificationProgress.stage).toBe('Processing'));
    await waitFor(() => expect(result.current.attestation?.kind).toBe('attestation'));
    expect(useWizardStore.getState().verificationProgress.stage).toBe('Attested');
  });

  it('ignores an attestation for another request', async () => {
    const eventSource = jest.fn().mockResolvedValue({ events: [event('Attested', '99')], latestLedger: 100 });
    const { result, unmount } = renderHook(() =>
      usePollAttestation({ requestId: '42', intervalMs: 5, eventSource })
    );
    await waitFor(() => expect(eventSource).toHaveBeenCalled());
    expect(result.current.attestation).toBeNull();
    unmount();
  });

  it('surfaces RPC errors and can retry', async () => {
    const eventSource = jest.fn().mockRejectedValueOnce(new Error('RPC unavailable')).mockResolvedValue({ events: [], latestLedger: 100 });
    const { result } = renderHook(() =>
      usePollAttestation({ requestId: '42', intervalMs: 10_000, eventSource })
    );
    await waitFor(() => expect(result.current.error).toBe('RPC unavailable'));
    act(() => result.current.retry());
    await waitFor(() => expect(eventSource).toHaveBeenCalledTimes(2));
  });
});
