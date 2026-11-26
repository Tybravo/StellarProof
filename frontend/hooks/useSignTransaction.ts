'use client';

import { useCallback, useState } from 'react';
import { signTransaction as requestSignature } from '@stellar/freighter-api';
import { Networks, Transaction } from '@stellar/stellar-sdk';

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
    const result = await requestSignature(xdr, options);
    if (typeof result === 'string') return result;
    if (result.error) throw result.error;
    if (!result.signedTxXdr) throw new Error('Freighter returned no signed transaction.');
    return result.signedTxXdr;
  } catch (cause) {
    throw new Error(transactionErrorMessage(cause));
  }
}

export interface UseSignTransactionResult {
  sign: typeof signWithFreighter;
  signTransaction: (transaction: Transaction, address: string) => Promise<string | null>;
  signedXdr: string | null;
  isSigning: boolean;
  error: string | null;
  reset: () => void;
}

export function useSignTransaction(
  networkPassphrase = process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET
): UseSignTransactionResult {
  const [signedXdr, setSignedXdr] = useState<string | null>(null);
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

  const reset = useCallback(() => {
    setSignedXdr(null);
    setError(null);
  }, []);

  const signTransaction = useCallback(
    async (transaction: Transaction, address: string): Promise<string | null> => {
      setIsSigning(true);
      setSignedXdr(null);
      setError(null);

      try {
        const result = await requestSignature(transaction.toXDR(), {
          address,
          networkPassphrase,
        });
        const xdr =
          typeof result === 'string'
            ? result
            : (result as { signedTxXdr?: string; signedTransaction?: string }).signedTxXdr ??
              (result as { signedTransaction?: string }).signedTransaction;
        if (!xdr) throw new Error('Freighter did not return a signed transaction.');
        setSignedXdr(xdr);
        return xdr;
      } catch (signingError) {
        const message =
          signingError instanceof Error ? signingError.message : 'Unable to sign the mint transaction.';
        setError(/declin|reject/i.test(message) ? 'The signing request was declined.' : message);
        return null;
      } finally {
        setIsSigning(false);
      }
    },
    [networkPassphrase]
  );

  return { sign, signTransaction, signedXdr, isSigning, error, reset };
}
