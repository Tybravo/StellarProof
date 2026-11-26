import { xdr } from '@stellar/stellar-sdk';
import {
  parseVerificationRequestEvent,
  SorobanEventParseError,
  type SorobanEventEnvelope,
} from '../parseSorobanEvents';

const HASH = Uint8Array.from({ length: 32 }, (_, index) => index);

function event(value: xdr.ScVal, topic = 'VerificationRequest'): SorobanEventEnvelope {
  return {
    id: '000001-0000000001',
    ledger: 1234,
    txHash: 'ab'.repeat(32),
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    topic: [xdr.ScVal.scvSymbol(topic)],
    value,
  };
}

function requestPayload(overrides: { requestId?: xdr.ScVal; contentHash?: xdr.ScVal } = {}) {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('content_hash'),
      val: overrides.contentHash ?? xdr.ScVal.scvBytes(Buffer.from(HASH)),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('request_id'),
      val: overrides.requestId ?? xdr.ScVal.scvU64(new xdr.Uint64(BigInt(42))),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol('state'),
      val: xdr.ScVal.scvSymbol('Pending'),
    }),
  ]);
}

describe('parseVerificationRequestEvent', () => {
  it('decodes request ID, content hash, state, and correlation metadata', () => {
    expect(parseVerificationRequestEvent(event(requestPayload()))).toEqual({
      type: 'VerificationRequest',
      eventId: '000001-0000000001',
      ledger: 1234,
      transactionHash: 'ab'.repeat(32),
      contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
      requestId: '42',
      contentHashHex: Array.from(HASH, (byte) => byte.toString(16).padStart(2, '0')).join(''),
      state: 'Pending',
    });
  });

  it('ignores unrelated contract events', () => {
    expect(parseVerificationRequestEvent(event(requestPayload(), 'CertificateMinted'))).toBeNull();
  });

  it('fails closed when a supported event has a malformed hash', () => {
    expect(() =>
      parseVerificationRequestEvent(
        event(requestPayload({ contentHash: xdr.ScVal.scvBytes(Buffer.from([1, 2])) }))
      )
    ).toThrow(SorobanEventParseError);
  });
});
