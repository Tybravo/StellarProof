import { Address, StrKey, scValToNative, xdr } from "@stellar/stellar-sdk";

export type SupportedSorobanEventName =
  | "VerificationRequest"
  | "Attestation"
  | "CertificateMinted";

export interface SorobanEventEnvelope {
  id: string;
  ledger: number;
  txHash: string;
  contractId?: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
}

interface ParsedEventBase {
  eventId: string;
  ledger: number;
  txHash: string;
  contractId?: string;
}

export interface ParsedVerificationRequestEvent extends ParsedEventBase {
  type: "VerificationRequest";
  requestId: string;
  contentHash: string;
  state?: string;
}

export interface ParsedAttestationEvent extends ParsedEventBase {
  type: "Attestation";
  requestId: string;
  provider: string;
  teeHash: string;
}

export interface ParsedCertificateMintedEvent extends ParsedEventBase {
  type: "CertificateMinted";
  owner: string;
  certificateId: string;
  manifestHash: string;
}

export type ParsedSorobanEvent =
  | ParsedVerificationRequestEvent
  | ParsedAttestationEvent
  | ParsedCertificateMintedEvent;

export class SorobanEventParseError extends Error {
  constructor(
    public readonly eventId: string,
    message: string
  ) {
    super(`Soroban event ${eventId}: ${message}`);
    this.name = "SorobanEventParseError";
    Object.setPrototypeOf(this, SorobanEventParseError.prototype);
  }
}

const EVENT_NAME_ALIASES: Readonly<Record<string, SupportedSorobanEventName>> = {
  VerificationRequest: "VerificationRequest",
  VerificationRequestEvent: "VerificationRequest",
  verification_request: "VerificationRequest",
  Attestation: "Attestation",
  attestation: "Attestation",
  CertificateMinted: "CertificateMinted",
  certificate_minted: "CertificateMinted",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) return record[key];
  }
  return undefined;
}

function requireString(value: unknown, field: string, eventId: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new SorobanEventParseError(eventId, `${field} must be a non-empty string`);
  }
  return value;
}

function integerString(value: unknown, field: string, eventId: string): string {
  if (typeof value === "bigint") {
    if (value < 0n) throw new SorobanEventParseError(eventId, `${field} must be non-negative`);
    return value.toString();
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return String(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  throw new SorobanEventParseError(eventId, `${field} must be a non-negative integer`);
}

function bytes32Hex(value: unknown, field: string, eventId: string): string {
  if (typeof value === "string" && /^[0-9a-fA-F]{64}$/.test(value)) {
    return value.toLowerCase();
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    if (bytes.length === 32) return bytes.toString("hex");
  }

  throw new SorobanEventParseError(eventId, `${field} must be exactly 32 bytes`);
}

function stellarAddress(value: unknown, field: string, eventId: string): string {
  const candidate =
    typeof value === "string"
      ? value
      : value instanceof Address
        ? value.toString()
        : null;

  if (
    candidate === null ||
    (!StrKey.isValidEd25519PublicKey(candidate) && !StrKey.isValidContract(candidate))
  ) {
    throw new SorobanEventParseError(eventId, `${field} must be a valid Stellar address`);
  }
  return candidate;
}

function common(event: SorobanEventEnvelope): ParsedEventBase {
  if (!event.id || !Number.isInteger(event.ledger) || event.ledger < 0 || !event.txHash) {
    throw new SorobanEventParseError(event.id || "<unknown>", "invalid event envelope");
  }

  return {
    eventId: event.id,
    ledger: event.ledger,
    txHash: event.txHash,
    ...(event.contractId ? { contractId: event.contractId } : {}),
  };
}

function decodeTopic(event: SorobanEventEnvelope): unknown[] {
  try {
    return event.topic.map((entry) => scValToNative(entry));
  } catch {
    throw new SorobanEventParseError(event.id, "topic XDR could not be decoded");
  }
}

function decodeValue(event: SorobanEventEnvelope): unknown {
  try {
    return scValToNative(event.value);
  } catch {
    throw new SorobanEventParseError(event.id, "value XDR could not be decoded");
  }
}

function eventName(topic: unknown[]): SupportedSorobanEventName | null {
  for (const entry of topic) {
    if (typeof entry === "string" && EVENT_NAME_ALIASES[entry]) {
      return EVENT_NAME_ALIASES[entry];
    }
  }
  return null;
}

function payloadRecord(value: unknown, eventId: string): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) {
    throw new SorobanEventParseError(eventId, "event payload must decode to a struct/map");
  }
  return record;
}

function parseVerificationRequest(
  event: SorobanEventEnvelope,
  value: unknown
): ParsedVerificationRequestEvent {
  const payload = payloadRecord(value, event.id);
  const state = pick(payload, "state");

  return {
    ...common(event),
    type: "VerificationRequest",
    requestId: integerString(pick(payload, "request_id", "requestId", "id"), "requestId", event.id),
    contentHash: bytes32Hex(
      pick(payload, "content_hash", "contentHash"),
      "contentHash",
      event.id
    ),
    ...(state === undefined ? {} : { state: requireString(state, "state", event.id) }),
  };
}

function parseAttestation(
  event: SorobanEventEnvelope,
  value: unknown
): ParsedAttestationEvent {
  const payload = payloadRecord(value, event.id);

  return {
    ...common(event),
    type: "Attestation",
    requestId: integerString(
      pick(payload, "request_id", "requestId"),
      "requestId",
      event.id
    ),
    provider: bytes32Hex(pick(payload, "provider"), "provider", event.id),
    teeHash: bytes32Hex(pick(payload, "tee_hash", "teeHash"), "teeHash", event.id),
  };
}

function parseCertificateMinted(
  event: SorobanEventEnvelope,
  topic: unknown[],
  value: unknown
): ParsedCertificateMintedEvent {
  const payload = asRecord(value);
  const nameIndex = topic.findIndex(
    (entry) =>
      typeof entry === "string" &&
      EVENT_NAME_ALIASES[entry] === "CertificateMinted"
  );
  const fields = nameIndex >= 0 ? topic.slice(nameIndex + 1) : [];

  const owner = payload ? pick(payload, "owner") : fields[0];
  const certificateId = payload
    ? pick(payload, "certificate_id", "certificateId")
    : fields[1];
  const manifestHash = payload
    ? pick(payload, "manifest_hash", "manifestHash")
    : fields[2];

  return {
    ...common(event),
    type: "CertificateMinted",
    owner: stellarAddress(owner, "owner", event.id),
    certificateId: integerString(certificateId, "certificateId", event.id),
    manifestHash: requireString(manifestHash, "manifestHash", event.id),
  };
}

/**
 * Decode supported Soroban contract events into strongly typed, JSON-safe
 * objects. Unknown event names are skipped; malformed supported events fail
 * closed with SorobanEventParseError.
 */
export function parseSorobanEvents(
  events: readonly SorobanEventEnvelope[]
): ParsedSorobanEvent[] {
  const parsed: ParsedSorobanEvent[] = [];

  for (const event of events) {
    const topic = decodeTopic(event);
    const name = eventName(topic);
    if (name === null) continue;

    const value = decodeValue(event);
    switch (name) {
      case "VerificationRequest":
        parsed.push(parseVerificationRequest(event, value));
        break;
      case "Attestation":
        parsed.push(parseAttestation(event, value));
        break;
      case "CertificateMinted":
        parsed.push(parseCertificateMinted(event, topic, value));
        break;
    }
  }

  return parsed;
}
