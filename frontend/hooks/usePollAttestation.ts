'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { useWizardStore } from '@/features/verification/store/wizard.store';
import type { AttestationEvent } from '@/types/spv';

const ATTESTATION_TOPICS = ['Attestation', 'Attested', 'AttestationSubmitted'];
const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';

type NativeRecord = Record<string, unknown>;

export interface UsePollAttestationOptions {
  requestId: string | null;
  contractId?: string;
  rpcUrl?: string;
  intervalMs?: number;
  timeoutMs?: number;
  enabled?: boolean;
}

export interface UsePollAttestationResult {
  attestation: AttestationEvent | null;
  isPolling: boolean;
  error: string | null;
  hasTimedOut: boolean;
  retry: () => void;
}

function asRecord(value: unknown): NativeRecord {
  if (value instanceof Map) return Object.fromEntries(value.entries()) as NativeRecord;
  return value !== null && typeof value === 'object' ? (value as NativeRecord) : {};
}

function valueAsString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Uint8Array) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return undefined;
}

function pick(payload: NativeRecord, ...fields: string[]): string | undefined {
  for (const field of fields) {
    const value = valueAsString(payload[field]);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function decodeAttestationEvent(event: rpc.Api.EventResponse): AttestationEvent | null {
  const topics = event.topic.map((topic) => valueAsString(scValToNative(topic)));
  if (!topics.some((topic) => topic && ATTESTATION_TOPICS.includes(topic))) return null;

  const raw = asRecord(scValToNative(event.value));
  const requestId = pick(raw, 'request_id', 'requestId', 'id');
  if (!requestId) return null;

  return {
    eventId: event.id,
    requestId,
    transactionHash: event.txHash,
    ledger: event.ledger,
    providerHex: pick(raw, 'provider', 'provider_hex', 'providerHex'),
    teeHashHex: pick(raw, 'tee_hash', 'teeHash', 'attestation_hash', 'attestationHash'),
    signatureHex: pick(raw, 'signature', 'signature_hex', 'signatureHex'),
    raw,
  };
}

export function usePollAttestation({
  requestId,
  contractId = process.env.NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID,
  rpcUrl = process.env.NEXT_PUBLIC_VITE_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL,
  intervalMs = 4_000,
  timeoutMs = 120_000,
  enabled = true,
}: UsePollAttestationOptions): UsePollAttestationResult {
  const setVerificationStage = useWizardStore((state) => state.setVerificationStage);
  const [attestation, setAttestation] = useState<AttestationEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const startLedgerRef = useRef<number | null>(null);

  const retry = useCallback(() => {
    startLedgerRef.current = null;
    setAttestation(null);
    setError(null);
    setHasTimedOut(false);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !requestId || !contractId || attestation) return;

    const server = new rpc.Server(rpcUrl);
    let cancelled = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= timeoutMs) {
        setHasTimedOut(true);
        setError('The Oracle did not submit an attestation before the polling deadline.');
        return;
      }

      try {
        if (startLedgerRef.current === null) {
          startLedgerRef.current = (await server.getLatestLedger()).sequence;
        }
        const topics = ATTESTATION_TOPICS.map((topic) => [
          xdr.ScVal.scvSymbol(topic).toXDR('base64'),
        ]);
        const response = await server.getEvents({
          startLedger: startLedgerRef.current,
          filters: [{ type: 'contract', contractIds: [contractId], topics }],
          limit: 100,
        });
        startLedgerRef.current = response.latestLedger;

        const matched = response.events
          .map(decodeAttestationEvent)
          .find((event) => event?.requestId === requestId);
        if (matched && !cancelled) {
          setAttestation(matched);
          setVerificationStage('Attested');
          setError(null);
          return;
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError instanceof Error ? pollError.message : 'Unable to poll Soroban events.');
        }
      }

      timer = setTimeout(poll, intervalMs);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attestation, attempt, contractId, enabled, intervalMs, requestId, rpcUrl, setVerificationStage, timeoutMs]);

  return {
    attestation,
    isPolling: enabled && Boolean(requestId && contractId) && !attestation && !hasTimedOut,
    error,
    hasTimedOut,
    retry,
  };
}
