import { scValToNative, xdr } from '@stellar/stellar-sdk';

export interface SorobanEventEnvelope {
  id: string;
  ledger: number;
  txHash: string;
  contractId?: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

export interface ParsedVerificationRequestEvent {
  type: 'VerificationRequest';
  eventId: string;
  ledger: number;
  transactionHash: string;
  contractId?: string;
  requestId: string;
  contentHashHex: string;
  state?: string;
}

export class SorobanEventParseError extends Error {
  constructor(eventId: string, detail: string) {
    super(`Soroban event ${eventId}: ${detail}`);
    this.name = 'SorobanEventParseError';
  }
}

function record(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value.entries()) as Record<string, unknown>;
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function field(payload: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(payload, name)) return payload[name];
  }
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return undefined;
}

function requiredInteger(value: unknown, fieldName: string, eventId: string): string {
  const candidate = stringValue(value);
  if (!candidate || !/^\d+$/.test(candidate)) {
    throw new SorobanEventParseError(eventId, `${fieldName} must be a non-negative integer`);
  }
  return candidate;
}

function bytes32(value: unknown, fieldName: string, eventId: string): string {
  if (typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)) return value.toLowerCase();
  if (value instanceof Uint8Array && value.byteLength === 32) {
    return Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  throw new SorobanEventParseError(eventId, `${fieldName} must be exactly 32 bytes`);
}

function isVerificationRequestTopic(topic: xdr.ScVal[]): boolean {
  return topic.some((entry) => {
    const value = stringValue(scValToNative(entry));
    return value === 'VerificationRequest' || value === 'VerificationRequestEvent';
  });
}

/** Decode VerificationRequest events emitted by the Soroban Oracle contract. */
export function parseVerificationRequestEvent(
  event: SorobanEventEnvelope
): ParsedVerificationRequestEvent | null {
  if (!isVerificationRequestTopic(event.topic)) return null;
  if (!event.id || !event.txHash || !Number.isSafeInteger(event.ledger) || event.ledger < 0) {
    throw new SorobanEventParseError(event.id || '<unknown>', 'invalid event envelope');
  }

  const payload = record(scValToNative(event.value));
  const requestId = requiredInteger(
    field(payload, 'request_id', 'requestId', 'id'),
    'requestId',
    event.id
  );
  const contentHashHex = bytes32(
    field(payload, 'content_hash', 'contentHash'),
    'contentHash',
    event.id
  );
  const state = stringValue(field(payload, 'state'));

  return {
    type: 'VerificationRequest',
    eventId: event.id,
    ledger: event.ledger,
    transactionHash: event.txHash,
    ...(event.contractId ? { contractId: event.contractId } : {}),
    requestId,
    contentHashHex,
    ...(state ? { state } : {}),
  };
}
