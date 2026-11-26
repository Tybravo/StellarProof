'use client';

import { useEffect, useState } from 'react';

export const SPV_STATUSES = ['pending', 'processing', 'tee_verifying', 'minting', 'completed', 'failed'] as const;
export type SpvStatus = typeof SPV_STATUSES[number];
export interface SpvUpdate { status: SpvStatus }

export function parseSpvUpdate(data: string): SpvUpdate {
  const value: unknown = JSON.parse(data);
  if (!value || typeof value !== 'object' || !('status' in value) ||
      !SPV_STATUSES.includes(value.status as SpvStatus)) throw new Error('Invalid SPV status update');
  return { status: value.status as SpvStatus };
}

// The caller supplies the authenticated job stream URL. Cookie authentication
// is supported through withCredentials, without exposing bearer tokens in URLs.
export function useSpvUpdates(streamUrl?: string) {
  const [update, setUpdate] = useState<SpvUpdate | null>(null);
  const [connection, setConnection] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'>('idle');
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    // Reset the subscription state when its request identity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUpdate(null);
    setError(null);
    setConnection(streamUrl ? 'connecting' : 'idle');
    if (!streamUrl) return;
    const source = new EventSource(streamUrl, { withCredentials: true });
    source.onopen = () => { setConnection('connected'); setError(null); };
    const receive = (event: MessageEvent<string>) => {
      try {
        const next = parseSpvUpdate(event.data);
        setUpdate(next);
        setError(null);
        if (next.status === 'completed' || next.status === 'failed') {
          source.close();
          setConnection('closed');
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause : new Error('Invalid SPV update'));
      }
    };
    source.onmessage = receive;
    source.addEventListener('status', receive as EventListener);
    source.onerror = () => {
      setConnection(source.readyState === EventSource.CLOSED ? 'closed' : 'reconnecting');
      setError(new Error('Status stream interrupted. Reconnecting when available.'));
    };
    return () => source.close();
  }, [streamUrl]);
  return { update, connection, error };
}
