/** @jest-environment node */
import { Account, Keypair, Networks, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import { Spec } from '@stellar/stellar-sdk/contract';
import { buildVerificationTx, prepareVerificationTransaction } from '../useBuildVerificationTx';
import { useWizardStore } from '../../features/verification/store/wizard.store';

function spec(order = ['requester', 'manifest_cid', 'media_cid']) {
  return new Spec([xdr.ScSpecEntry.scSpecEntryFunctionV0(new xdr.ScSpecFunctionV0({
    doc: '', name: 'request_verification',
    inputs: order.map(name => new xdr.ScSpecFunctionInputV0({
      doc: '', name, type: name === 'requester' ? xdr.ScSpecTypeDef.scSpecTypeAddress() : xdr.ScSpecTypeDef.scSpecTypeString(),
    })), outputs: [],
  }))]);
}

function options() {
  return { account: new Account(Keypair.random().publicKey(), '12'),
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
    networkPassphrase: Networks.TESTNET, spec: spec() };
}

test('returns a real builder and serializes CID Strings in contract-spec order', () => {
  const input = options();
  const builder = buildVerificationTx(input, 'bafy-media', 'bafy-manifest');
  expect(builder).toBeInstanceOf(TransactionBuilder);
  const tx = builder.build();
  const encoded = xdr.TransactionEnvelope.fromXDR(tx.toXDR(), 'base64');
  const call = encoded.v1().tx().operations()[0].body().invokeHostFunctionOp().hostFunction().invokeContract();
  expect(call.functionName().toString()).toBe('request_verification');
  expect(call.args()[0].address().accountId().ed25519()).toHaveLength(32);
  expect(call.args()[1].switch().name).toBe('scvString');
  expect(call.args()[1].str().toString()).toBe('bafy-manifest');
  expect(call.args()[2].str().toString()).toBe('bafy-media');
  expect(tx.sequence).toBe('13');
});

test('supports optional manifest and rejects missing media or incompatible contract specs', () => {
  const builder = buildVerificationTx({ ...options(), spec: spec(['mediaCid', 'manifestCid']) }, 'bafy-media', null);
  const call = xdr.TransactionEnvelope.fromXDR(builder.build().toXDR(), 'base64')
    .v1().tx().operations()[0].body().invokeHostFunctionOp().hostFunction().invokeContract();
  expect(call.args()[1].str().toString()).toBe('');
  expect(() => buildVerificationTx(options(), null, null)).toThrow(/Upload media/);
  expect(() => buildVerificationTx({ ...options(), spec: spec(['unknown']) }, 'bafy-media', null)).toThrow(/Unsupported/);
});

test('RPC preparation receives the built transaction before signing', async () => {
  const builder = buildVerificationTx(options(), 'bafy-media', 'bafy-manifest');
  const server = { prepareTransaction: jest.fn().mockResolvedValue('prepared') };
  expect(await prepareVerificationTransaction(builder, server)).toBe('prepared');
  expect(server.prepareTransaction).toHaveBeenCalledTimes(1);
});

test('CID store updates invalidate stale uploads and tolerate legacy content', () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const store = useWizardStore.getState();
  store.resetWizard();
  store.setContentHash('legacy-hash');
  expect(useWizardStore.getState().formData.content?.mediaCid).toBeNull();
  store.setVerificationCids('bafy-media', 'bafy-manifest');
  expect(useWizardStore.getState().formData.content?.mediaCid).toBe('bafy-media');
  store.setManifest(null, null);
  expect(useWizardStore.getState().formData.content?.manifestCid).toBeNull();
  store.setUploadFile(null);
  expect(useWizardStore.getState().formData.content?.mediaCid).toBeNull();
  warning.mockRestore();
});
