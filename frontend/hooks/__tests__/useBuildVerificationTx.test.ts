/** @jest-environment node */
import { Account, Keypair, Networks, Transaction, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import { buildVerificationTx } from '../useBuildVerificationTx';

test('oracle invocation encodes the current ABI and 32-byte hash in XDR', () => {
  const address = Keypair.random().publicKey();
  const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
  const tx = buildVerificationTx({ account: new Account(address, '12'), contractId,
    contentHash: 'ab'.repeat(32), networkPassphrase: Networks.TESTNET });
  const decoded = TransactionBuilder.fromXDR(tx.toXDR(), Networks.TESTNET);
  if (!(decoded instanceof Transaction)) throw new Error('Expected a standard transaction');
  expect(decoded.fee).toBe('100');
  expect(decoded.sequence).toBe('13');
  const envelope = xdr.TransactionEnvelope.fromXDR(tx.toXDR(), 'base64');
  const operation = envelope.v1().tx().operations()[0].body().invokeHostFunctionOp().hostFunction().invokeContract();
  expect(operation.functionName().toString()).toBe('submit_request');
  expect(operation.args()).toHaveLength(1);
  expect(operation.args()[0].bytes()).toEqual(Buffer.from('ab'.repeat(32), 'hex'));
});

test('rejects invalid hashes before constructing a transaction', () => {
  expect(() => buildVerificationTx({ account: new Account(Keypair.random().publicKey(), '1'),
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
    contentHash: 'invalid', networkPassphrase: Networks.TESTNET })).toThrow(/32-byte/);
});
