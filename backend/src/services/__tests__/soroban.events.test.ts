/**
 * Soroban event retrieval (SorobanService.getEvents) and event XDR decoding.
 *
 * Fixtures are raw `getEvents` RPC events (base64 XDR topics and value) laid
 * out exactly as the deployed contracts emit them:
 *
 *   provenance  #[contractevent] CertificateMinted {
 *                 #[topic] owner: Address, #[topic] certificate_id: u64,
 *                 #[topic] manifest_hash: String }
 *               → topics [Symbol("certificate_minted"), Address, U64, String],
 *                 value: Map {} (every field is a topic)
 *
 *   registry    publish((Symbol("registry"), Symbol("TeeHashAdded"), BytesN<32>),
 *                       TeeHashEventData { hash: BytesN<32> })
 *               → topics [Symbol, Symbol, Bytes], value: Map { hash: Bytes }
 *
 * The RPC transport is mocked; no network calls are made.
 */
jest.mock('../../config/env', () => ({
  __esModule: true,
  env: {
    NODE_ENV: 'test',
    STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
    STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    STELLAR_RPC_TIMEOUT_MS: 30000,
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import crypto from 'crypto';
import { Address, Contract, Keypair, Networks, StrKey, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';
import { AppError } from '../../errors/AppError';
import { SorobanService } from '../soroban.service';

const PROVENANCE_CONTRACT_ID = StrKey.encodeContract(crypto.createHash('sha256').update('provenance').digest());
const REGISTRY_CONTRACT_ID = StrKey.encodeContract(crypto.createHash('sha256').update('registry').digest());
const OWNER = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)).publicKey();
const MANIFEST_HASH = crypto.createHash('sha256').update('manifest').digest('hex');
const TEE_HASH = Buffer.alloc(32, 2);
const TX_HASH = 'f'.repeat(64);

const b64 = (val: xdr.ScVal): string => val.toXDR('base64');

function rawEvent(overrides: Partial<rpc.Api.RawEventResponse>): rpc.Api.RawEventResponse {
  return {
    id: '0000004294971392-0000000001',
    type: 'contract',
    ledger: 1_000_001,
    ledgerClosedAt: '2026-09-01T12:00:00Z',
    pagingToken: '0000004294971392-0000000001',
    inSuccessfulContractCall: true,
    txHash: TX_HASH,
    contractId: PROVENANCE_CONTRACT_ID,
    topic: [],
    value: b64(xdr.ScVal.scvMap([])),
    ...overrides,
  };
}

const certificateMintedRaw = rawEvent({
  contractId: PROVENANCE_CONTRACT_ID,
  topic: [
    b64(xdr.ScVal.scvSymbol('certificate_minted')),
    b64(Address.fromString(OWNER).toScVal()),
    b64(xdr.ScVal.scvU64(new xdr.Uint64(BigInt(42)))),
    b64(xdr.ScVal.scvString(MANIFEST_HASH)),
  ],
  value: b64(xdr.ScVal.scvMap([])),
});

const teeHashAddedRaw = rawEvent({
  id: '0000004294971393-0000000002',
  pagingToken: '0000004294971393-0000000002',
  ledger: 1_000_002,
  contractId: REGISTRY_CONTRACT_ID,
  topic: [
    b64(xdr.ScVal.scvSymbol('registry')),
    b64(xdr.ScVal.scvSymbol('TeeHashAdded')),
    b64(xdr.ScVal.scvBytes(TEE_HASH)),
  ],
  value: b64(
    xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol('hash'), val: xdr.ScVal.scvBytes(TEE_HASH) }),
    ])
  ),
});

function rawResponse(events: rpc.Api.RawEventResponse[]): rpc.Api.RawGetEventsResponse {
  return { latestLedger: 1_000_010, cursor: events.at(-1)?.pagingToken ?? '', events };
}

const CERTIFICATE_MINTED_FILTER: rpc.Server.GetEventsRequest = {
  startLedger: 1_000_000,
  filters: [
    {
      type: 'contract',
      contractIds: [PROVENANCE_CONTRACT_ID],
      topics: [[b64(xdr.ScVal.scvSymbol('certificate_minted')), '*', '*', '*']],
    },
  ],
  limit: 100,
};

const CONFIG = { rpcUrl: 'https://rpc.example', networkPassphrase: Networks.TESTNET, allowHttp: false };

/** SorobanService over a stub `rpc.Server` exposing only `getEvents`. */
function stubbedService(getEvents: jest.Mock, timeoutMs = 1000) {
  return new SorobanService({ ...CONFIG, timeoutMs }, { getEvents } as unknown as rpc.Server);
}

async function expectAppError(promise: Promise<unknown>, statusCode: number, code: string) {
  const error = await promise.then(
    () => {
      throw new Error('expected rejection');
    },
    (err: unknown) => err
  );
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ statusCode, code });
}

describe('Soroban event XDR decoding', () => {
  it('decodes a provenance CertificateMinted event', () => {
    const { events, latestLedger, cursor } = rpc.parseRawEvents(rawResponse([certificateMintedRaw]));
    const [event] = events;

    expect(latestLedger).toBe(1_000_010);
    expect(cursor).toBe(certificateMintedRaw.pagingToken);
    expect(event).toMatchObject({
      id: certificateMintedRaw.id,
      type: 'contract',
      ledger: 1_000_001,
      txHash: TX_HASH,
      inSuccessfulContractCall: true,
    });
    expect(event.contractId).toBeInstanceOf(Contract);
    expect(event.contractId?.contractId()).toBe(PROVENANCE_CONTRACT_ID);

    expect(event.topic.map((t) => t.switch().name)).toEqual([
      'scvSymbol',
      'scvAddress',
      'scvU64',
      'scvString',
    ]);
    expect(event.topic.map((t) => scValToNative(t))).toEqual([
      'certificate_minted',
      OWNER,
      BigInt(42),
      MANIFEST_HASH,
    ]);
    expect(scValToNative(event.value)).toEqual({});
  });

  it('decodes a registry TeeHashAdded event', () => {
    const [event] = rpc.parseRawEvents(rawResponse([teeHashAddedRaw])).events;

    expect(event.contractId?.contractId()).toBe(REGISTRY_CONTRACT_ID);
    expect(event.topic.map((t) => t.switch().name)).toEqual(['scvSymbol', 'scvSymbol', 'scvBytes']);

    const [namespace, name, hash] = event.topic.map((t) => scValToNative(t));
    expect(namespace).toBe('registry');
    expect(name).toBe('TeeHashAdded');
    expect(Buffer.from(hash as Uint8Array).equals(TEE_HASH)).toBe(true);

    const data = scValToNative(event.value) as { hash: Uint8Array };
    expect(Object.keys(data)).toEqual(['hash']);
    expect(Buffer.from(data.hash).equals(TEE_HASH)).toBe(true);
  });

  it('preserves event order and paging tokens across a page', () => {
    const { events, cursor } = rpc.parseRawEvents(rawResponse([certificateMintedRaw, teeHashAddedRaw]));

    expect(events.map((e) => e.pagingToken)).toEqual([
      certificateMintedRaw.pagingToken,
      teeHashAddedRaw.pagingToken,
    ]);
    expect(cursor).toBe(teeHashAddedRaw.pagingToken);
  });

  it('omits contractId for events without an emitting contract', () => {
    const [event] = rpc.parseRawEvents(rawResponse([rawEvent({ type: 'system', contractId: '' })])).events;

    expect(event.type).toBe('system');
    expect(event.contractId).toBeUndefined();
  });

  it('treats a missing events array as an empty page', () => {
    const raw = { latestLedger: 5, cursor: '' } as unknown as rpc.Api.RawGetEventsResponse;
    expect(rpc.parseRawEvents(raw).events).toEqual([]);
  });

  it('rejects a topic that is not valid XDR', () => {
    const malformed = rawEvent({ topic: ['bm90LXhkcg=='] });
    expect(() => rpc.parseRawEvents(rawResponse([malformed]))).toThrow();
  });

  it('rejects a truncated event value', () => {
    const full = certificateMintedRaw.topic[3];
    const truncated = Buffer.from(full, 'base64').subarray(0, 6).toString('base64');
    expect(() => rpc.parseRawEvents(rawResponse([rawEvent({ value: truncated })]))).toThrow();
  });
});

describe('SorobanService.getEvents', () => {
  it('invokes rpc.Server#getEvents once with the request unchanged', async () => {
    const getEvents = jest.fn().mockResolvedValue(rpc.parseRawEvents(rawResponse([])));
    const service = stubbedService(getEvents);

    await service.getEvents(CERTIFICATE_MINTED_FILTER);

    expect(getEvents).toHaveBeenCalledTimes(1);
    expect(getEvents).toHaveBeenCalledWith(CERTIFICATE_MINTED_FILTER);
  });

  it('forwards cursor-based pagination requests', async () => {
    const getEvents = jest.fn().mockResolvedValue(rpc.parseRawEvents(rawResponse([])));
    const request: rpc.Server.GetEventsRequest = {
      cursor: certificateMintedRaw.pagingToken,
      filters: CERTIFICATE_MINTED_FILTER.filters,
      limit: 10,
    };

    await stubbedService(getEvents).getEvents(request);

    expect(getEvents).toHaveBeenCalledWith(request);
  });

  it('passes the RPC response through untouched', async () => {
    const response = rpc.parseRawEvents(rawResponse([certificateMintedRaw, teeHashAddedRaw]));
    const service = stubbedService(jest.fn().mockResolvedValue(response));

    await expect(service.getEvents(CERTIFICATE_MINTED_FILTER)).resolves.toBe(response);
  });

  it('returns SDK-decoded events when only the rpc.Server transport is mocked', async () => {
    const server = new rpc.Server(CONFIG.rpcUrl);
    const transport = jest.spyOn(server, '_getEvents').mockResolvedValue(rawResponse([certificateMintedRaw]));
    const service = new SorobanService({ ...CONFIG, timeoutMs: 1000 }, server);

    const { events } = await service.getEvents(CERTIFICATE_MINTED_FILTER);

    expect(transport).toHaveBeenCalledWith(CERTIFICATE_MINTED_FILTER);
    expect(events).toHaveLength(1);
    expect(events[0].topic.map((t) => scValToNative(t))).toEqual([
      'certificate_minted',
      OWNER,
      BigInt(42),
      MANIFEST_HASH,
    ]);
  });

  it('maps invalid-params JSON-RPC errors to 400 SOROBAN_INVALID_REQUEST', async () => {
    const service = stubbedService(
      jest.fn().mockRejectedValue({ code: -32602, message: 'startLedger must be positive' })
    );

    await expectAppError(service.getEvents(CERTIFICATE_MINTED_FILTER), 400, 'SOROBAN_INVALID_REQUEST');
  });

  it('maps other JSON-RPC errors to 502 SOROBAN_RPC_ERROR', async () => {
    const service = stubbedService(jest.fn().mockRejectedValue({ code: -32603, message: 'internal error' }));

    await expectAppError(service.getEvents(CERTIFICATE_MINTED_FILTER), 502, 'SOROBAN_RPC_ERROR');
  });

  it('maps an unreachable endpoint to 503 SOROBAN_RPC_UNREACHABLE', async () => {
    const service = stubbedService(
      jest.fn().mockRejectedValue({ isAxiosError: true, code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' })
    );

    await expectAppError(service.getEvents(CERTIFICATE_MINTED_FILTER), 503, 'SOROBAN_RPC_UNREACHABLE');
  });

  it('maps HTTP 429 to SOROBAN_RPC_RATE_LIMITED', async () => {
    const service = stubbedService(
      jest.fn().mockRejectedValue({ isAxiosError: true, message: 'Too Many Requests', response: { status: 429 } })
    );

    await expectAppError(service.getEvents(CERTIFICATE_MINTED_FILTER), 429, 'SOROBAN_RPC_RATE_LIMITED');
  });

  it('fails with 504 SOROBAN_RPC_TIMEOUT when the RPC does not answer in time', async () => {
    const service = stubbedService(jest.fn(() => new Promise(() => undefined)), 20);

    await expectAppError(service.getEvents(CERTIFICATE_MINTED_FILTER), 504, 'SOROBAN_RPC_TIMEOUT');
  });
});
