'use client';

import { useCallback } from 'react';
import { Account, BASE_FEE, Contract, TransactionBuilder, xdr } from '@stellar/stellar-sdk';

export interface VerificationTxOptions {
  account: Account;
  contractId: string;
  contentHash: string;
  networkPassphrase: string;
  fee?: string;
}

// The checked-in oracle ABI is submit_request(BytesN<32>), returning a u64.
// RPC simulation/preparation must follow before the transaction is signed.
export function buildVerificationTx({ account, contractId, contentHash, networkPassphrase,
  fee = BASE_FEE }: VerificationTxOptions) {
  if (!/^[a-fA-F0-9]{64}$/.test(contentHash)) throw new Error('A 32-byte SHA-256 content hash is required.');
  return new TransactionBuilder(account, { fee, networkPassphrase })
    .addOperation(new Contract(contractId).call('submit_request',
      xdr.ScVal.scvBytes(Buffer.from(contentHash, 'hex'))))
    .setTimeout(30)
    .build();
}

export function useBuildVerificationTx() {
  return useCallback((options: VerificationTxOptions) => buildVerificationTx(options), []);
}
