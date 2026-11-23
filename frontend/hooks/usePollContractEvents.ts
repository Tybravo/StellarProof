'use client';

import { useCallback, useEffect, useState } from 'react';
import { rpc, xdr } from '@stellar/stellar-sdk';

const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';
const EMPTY_TOPICS: string[] = [];

export interface PollContractEvent {
  id: string;
  ledger: number;
  txHash: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

export interface PollEventBatch {
  events: PollContractEvent[];
  latestLedger: number;
}

export type ContractEventSource = (startLedger?: number) => Promise<PollEventBatch>;

export interface UsePollContractEventsOptions {
  contractId?: string;
  topicNames?: string[];
  rpcUrl?: string;
  enabled?: boolean;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  multiplier?: number;
  matchEvent: (event: PollContractEvent) => boolean;
  eventSource?: ContractEventSource;
}

export function calculateBackoff(
  attempt: number,
  initialIntervalMs: number,
  maxIntervalMs: number,
  multiplier = 2
): number {
  if (attempt < 0 || initialIntervalMs <= 0 || maxIntervalMs < initialIntervalMs || multiplier < 1) {
    throw new Error('Invalid polling backoff configuration.');
  }
  return Math.min(maxIntervalMs, Math.round(initialIntervalMs * multiplier ** attempt));
}

function rpcSource(contractId: string, rpcUrl: string, topicNames: string[]): ContractEventSource {
  const server = new rpc.Server(rpcUrl);
  const topics = topicNames.map((name) => [xdr.ScVal.scvSymbol(name).toXDR('base64')]);
  return async (startLedger) => {
    const ledger = startLedger ?? (await server.getLatestLedger()).sequence;
    const response = await server.getEvents({
      startLedger: ledger,
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
          ...(topics.length > 0 ? { topics } : {}),
        },
      ],
      limit: 100,
    });
    return { events: response.events, latestLedger: response.latestLedger };
  };
}

export function usePollContractEvents({
  contractId = process.env.NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID ?? '',
  topicNames = EMPTY_TOPICS,
  rpcUrl = process.env.NEXT_PUBLIC_VITE_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL,
  enabled = true,
  initialIntervalMs = 1_000,
  maxIntervalMs = 30_000,
  multiplier = 2,
  matchEvent,
  eventSource,
}: UsePollContractEventsOptions) {
  const topicKey = topicNames.join('\u0000');
  const [event, setEvent] = useState<PollContractEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [nextPollInMs, setNextPollInMs] = useState(initialIntervalMs);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setEvent(null);
    setError(null);
    setAttempt(0);
    setNextPollInMs(initialIntervalMs);
    setRetryKey((value) => value + 1);
  }, [initialIntervalMs]);

  useEffect(() => {
    if (!enabled || event || (!contractId && !eventSource)) return;
    const source = eventSource ?? rpcSource(contractId, rpcUrl, topicKey ? topicKey.split('\u0000') : []);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let startLedger: number | undefined;
    let currentAttempt = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const batch = await source(startLedger);
        startLedger = batch.latestLedger;
        const matched = batch.events.find(matchEvent);
        if (matched) {
          setEvent(matched);
          setError(null);
          return;
        }
        setError(null);
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : 'Unable to poll contract events.');
      }

      const delay = calculateBackoff(currentAttempt, initialIntervalMs, maxIntervalMs, multiplier);
      setAttempt(currentAttempt + 1);
      setNextPollInMs(delay);
      currentAttempt += 1;
      timer = setTimeout(poll, delay);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [contractId, enabled, event, eventSource, initialIntervalMs, matchEvent, maxIntervalMs, multiplier, retryKey, rpcUrl, topicKey]);

  return {
    event,
    error,
    attempt,
    nextPollInMs,
    isPolling: enabled && !event,
    retry,
  };
}
