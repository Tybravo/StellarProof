'use client';

import { useCallback, useEffect, useState } from 'react';
import { scValToNative, xdr } from '@stellar/stellar-sdk';
import { useWizardStore } from '@/features/verification/store/wizard.store';
import { FailoverRpcServer } from '@/services/rpcWrapper';

const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';
const TOPICS = ['VerificationRequest', 'Attestation', 'Attested'];

export interface ContractEvent {
  id: string;
  ledger: number;
  txHash: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

export interface ContractEventBatch {
  events: ContractEvent[];
  latestLedger: number;
}

export type AttestationEventSource = (startLedger?: number) => Promise<ContractEventBatch>;

export interface ParsedPollingEvent {
  kind: 'request' | 'attestation';
  requestId: string;
  transactionHash: string;
  ledger: number;
}

export interface UsePollAttestationOptions {
  requestId: string;
  contractId?: string;
  rpcUrl?: string;
  intervalMs?: number;
  timeoutMs?: number;
  enabled?: boolean;
  eventSource?: AttestationEventSource;
}

function record(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value.entries()) as Record<string, unknown>;
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint'
    ? String(value)
    : undefined;
}

export function parsePollingEvent(event: ContractEvent): ParsedPollingEvent | null {
  const names = event.topic.map((topic) => asString(scValToNative(topic)));
  const isRequest = names.includes('VerificationRequest');
  const isAttestation = names.includes('Attestation') || names.includes('Attested');
  if (!isRequest && !isAttestation) return null;

  const payload = record(scValToNative(event.value));
  const requestId = asString(payload.request_id ?? payload.requestId ?? payload.id);
  if (!requestId) return null;

  return {
    kind: isRequest ? 'request' : 'attestation',
    requestId,
    transactionHash: event.txHash,
    ledger: event.ledger,
  };
}

function rpcEventSource(contractId: string, rpcUrl: string): AttestationEventSource {
  const server = new FailoverRpcServer(rpcUrl);
  const topics = TOPICS.map((topic) => [xdr.ScVal.scvSymbol(topic).toXDR('base64')]);
  return async (startLedger) => {
    const initialLedger = startLedger ?? (await server.getLatestLedger()).sequence;
    const result = await server.getEvents({
      startLedger: initialLedger,
      filters: [{ type: 'contract', contractIds: [contractId], topics }],
      limit: 100,
    });
    return { events: result.events, latestLedger: result.latestLedger };
  };
}

export function usePollAttestation({
  requestId,
  contractId = process.env.NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID ?? '',
  rpcUrl = process.env.NEXT_PUBLIC_VITE_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL,
  intervalMs = 4_000,
  timeoutMs = 120_000,
  enabled = true,
  eventSource,
}: UsePollAttestationOptions) {
  const setProgress = useWizardStore((state) => state.setVerificationProgress);
  const [attestation, setAttestation] = useState<ParsedPollingEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => {
    setAttestation(null);
    setError(null);
    setHasTimedOut(false);
    setRetryKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !requestId || (!contractId && !eventSource) || attestation) return;
    const source = eventSource ?? rpcEventSource(contractId, rpcUrl);
    const startedAt = Date.now();
    let latestLedger: number | undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= timeoutMs) {
        setHasTimedOut(true);
        setError('Oracle attestation polling timed out.');
        return;
      }
      try {
        const batch = await source(latestLedger);
        latestLedger = batch.latestLedger;
        for (const event of batch.events) {
          const parsed = parsePollingEvent(event);
          if (!parsed || parsed.requestId !== requestId) continue;
          if (parsed.kind === 'request') {
            setProgress({
              stage: 'Processing',
              requestId: parsed.requestId,
              transactionHash: parsed.transactionHash,
            });
          } else {
            setProgress({
              stage: 'Attested',
              requestId: parsed.requestId,
              transactionHash: parsed.transactionHash,
            });
            setAttestation(parsed);
            setError(null);
            return;
          }
        }
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : 'Unable to poll contract events.');
      }
      timer = setTimeout(poll, intervalMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attestation, contractId, enabled, eventSource, intervalMs, requestId, retryKey, rpcUrl, setProgress, timeoutMs]);

  return {
    attestation,
    error,
    hasTimedOut,
    isPolling: enabled && !attestation && !hasTimedOut,
    connectionState: error ? 'reconnecting' : 'connected',
    retry,
  } as const;
}
