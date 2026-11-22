'use client';

import { useCallback, useState } from 'react';
import { signTransaction } from '@stellar/freighter-api';

export function transactionErrorMessage(cause: unknown): string {
  const error = cause as { message?: string; code?: number | string; response?: { data?: { extras?: { result_codes?: { transaction?: string } } } } };
  const message = typeof cause === 'string' ? cause : error?.message ?? '';
  const code = error?.response?.data?.extras?.result_codes?.transaction;
  if (code === 'tx_insufficient_fee' || code === 'tx_insufficient_balance' ||
      /tx_insufficient_fee|tx_insufficient_balance|insufficient (balance|funds|fee)/i.test(message)) {
    return 'Insufficient XLM to cover the transaction fee and required balance. Add XLM to your wallet and try again.';
  }
  if (/tx_bad_seq/i.test(message)) return 'Transaction sequence error. Please try again.';
  if (error?.code === -4 || error?.code === 4001 || /reject|declin|denied|cancel/i.test(message)) {
    return 'You declined the Freighter signing request. Your upload is saved. Try again when ready.';
  }
  return message || 'Unable to sign or submit the transaction. Please try again.';
}

export async function signWithFreighter(xdr: string, options: { address: string; networkPassphrase: string }) {
  try {
    const result = await signTransaction(xdr, options);
    if (typeof result === 'string') return result;
    if (result.error) throw result.error;
    if (!result.signedTxXdr) throw new Error('Freighter returned no signed transaction.');
    return result.signedTxXdr;
  } catch (cause) {
    throw new Error(transactionErrorMessage(cause));
  }
}

export function useSignTransaction() {
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sign = useCallback(async (xdr: string, options: { address: string; networkPassphrase: string }) => {
    setError(null);
    setIsSigning(true);
    try {
      return await signWithFreighter(xdr, options);
    } catch (cause) {
      const message = transactionErrorMessage(cause);
      setError(message);
      throw new Error(message);
    } finally {
      setIsSigning(false);
    }
  }, []);
  return { sign, isSigning, error };
}
