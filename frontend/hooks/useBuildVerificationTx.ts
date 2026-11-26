'use client';

import { useCallback } from 'react';
import { Account, BASE_FEE, Contract, TransactionBuilder, rpc } from '@stellar/stellar-sdk';
import { Spec } from '@stellar/stellar-sdk/contract';
import { useWizardStore } from '@/features/verification/store/wizard.store';

export interface VerificationTxOptions {
  account: Account;
  contractId: string;
  networkPassphrase: string;
  /** Spec for the deployed contract, which determines argument names and order. */
  spec: Spec;
  fee?: string;
}

export function buildVerificationTx(
  { account, contractId, networkPassphrase, spec, fee = BASE_FEE }: VerificationTxOptions,
  mediaCid: string | null,
  manifestCid: string | null,
): TransactionBuilder {
  if (!mediaCid || /\s/.test(mediaCid) || (manifestCid !== null && /\s/.test(manifestCid))) {
    throw new Error('Upload media and supply valid CID strings before building the transaction.');
  }
  const args: Record<string, string> = {};
  let mediaFound = false;
  let manifestFound = false;
  for (const input of spec.getFunc('request_verification').inputs()) {
    const name = input.name().toString();
    if (name === 'media_cid' || name === 'mediaCid') {
      if (input.type().switch().name !== 'scSpecTypeString') throw new Error('The media CID argument must be a Soroban String.');
      args[name] = mediaCid;
      mediaFound = true;
    } else if (name === 'manifest_cid' || name === 'manifestCid') {
      if (input.type().switch().name !== 'scSpecTypeString') throw new Error('The manifest CID argument must be a Soroban String.');
      args[name] = manifestCid ?? '';
      manifestFound = true;
    } else if (name === 'requester') {
      args[name] = account.accountId();
    } else {
      throw new Error(`Unsupported request_verification argument: ${name}`);
    }
  }
  if (!mediaFound || !manifestFound) throw new Error('The contract spec must declare media and manifest CID arguments.');
  return new TransactionBuilder(account, { fee, networkPassphrase })
    .addOperation(new Contract(contractId).call('request_verification', ...spec.funcArgsToScVals('request_verification', args)))
    .setTimeout(30);
}

/** Uses same-origin RPC so browser code contains no upstream endpoint. */
export function createVerificationRpc() {
  const url = new URL('/api/rpc', window.location.origin);
  return new rpc.Server(url.href, { allowHttp: url.protocol === 'http:' });
}

/** Simulation adds the Soroban resource footprint and fees before Freighter signing. */
export async function prepareVerificationTransaction(
  builder: TransactionBuilder,
  server: Pick<rpc.Server, 'prepareTransaction'> = createVerificationRpc(),
) {
  return server.prepareTransaction(builder.build());
}

export function useBuildVerificationTx() {
  const mediaCid = useWizardStore(state => state.formData.content?.mediaCid ?? null);
  const manifestCid = useWizardStore(state => state.formData.content?.manifestCid ?? null);
  return useCallback((options: VerificationTxOptions) => buildVerificationTx(options, mediaCid, manifestCid), [mediaCid, manifestCid]);
}
