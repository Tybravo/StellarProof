'use client';

import { useEffect, useState } from 'react';
import { rpc, scValToNative, StrKey, xdr } from '@stellar/stellar-sdk';

export interface VerificationRequestEvent {
  mediaCid: string;
  manifestCid: string;
  requester: string;
}

export function decodeVerificationRequestEvent(value: xdr.ScVal): VerificationRequestEvent {
  const data = scValToNative(value);
  if (!data || typeof data !== 'object') throw new Error('Invalid verification event payload');
  const mediaCid = data.media_cid ?? data.mediaCid;
  const manifestCid = data.manifest_cid ?? data.manifestCid;
  const requester = data.requester;
  if (typeof mediaCid !== 'string' || !mediaCid || typeof manifestCid !== 'string' ||
      typeof requester !== 'string' || !StrKey.isValidEd25519PublicKey(requester)) {
    throw new Error('Verification event must contain CIDs and a requester public key');
  }
  return { mediaCid, manifestCid, requester };
}

export interface PollContractEventsOptions extends VerificationRequestEvent {
  server: Pick<rpc.Server, 'getEvents'>;
  contractId: string;
  transactionHash: string;
  startLedger: number;
  intervalMs?: number;
  timeoutMs?: number;
  enabled?: boolean;
}

export function usePollContractEvents({ server, contractId, transactionHash, startLedger,
  mediaCid, manifestCid, requester, intervalMs = 3000, timeoutMs = 120000,
  enabled = true }: PollContractEventsOptions) {
  const [event, setEvent] = useState<VerificationRequestEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    // Reset the subscription state when its request identity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvent(null);
    setError(null);
    setLoading(enabled);
    if (!enabled) return;
    if (!Number.isInteger(startLedger) || startLedger < 1 || !transactionHash || !contractId ||
        !Number.isFinite(intervalMs) || intervalMs < 1 || !Number.isFinite(timeoutMs) || timeoutMs < 1) {
      setError(new Error('Invalid event polling configuration'));
      setLoading(false);
      return;
    }
    const deadline = setTimeout(() => {
      cancelled = true;
      clearTimeout(timer);
      setError(new Error('Timed out waiting for the verification request event'));
      setLoading(false);
    }, timeoutMs);
    let cursor: string | undefined;
    async function poll() {
      try {
        const result = await server.getEvents({
          ...(cursor ? { cursor } : { startLedger }),
          filters: [{ type: 'contract', contractIds: [contractId] }], limit: 100,
        });
        if (cancelled) return;
        for (const candidate of result.events) {
          if (candidate.txHash !== transactionHash || !candidate.inSuccessfulContractCall ||
              !candidate.topic.some(topic => scValToNative(topic) === 'VerificationRequestEvent')) continue;
          const decoded = decodeVerificationRequestEvent(candidate.value);
          if (decoded.mediaCid !== mediaCid || decoded.manifestCid !== manifestCid || decoded.requester !== requester) {
            throw new Error('Registered verification request differs from the submitted upload');
          }
          setEvent(decoded);
          setLoading(false);
          clearTimeout(deadline);
          return;
        }
        cursor = result.cursor;
        timer = setTimeout(poll, intervalMs);
      } catch (cause) {
        if (cancelled) return;
        clearTimeout(deadline);
        setError(cause instanceof Error ? cause : new Error('Event polling failed'));
        setLoading(false);
      }
    }
    void poll();
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(deadline); };
  }, [server, contractId, transactionHash, startLedger, mediaCid, manifestCid, requester, intervalMs, timeoutMs, enabled]);
  return { event, error, isLoading };
}
