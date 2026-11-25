'use client';

import { useCallback, useState } from 'react';
import { signTransaction as signWithFreighter } from '@stellar/freighter-api';
import { Networks, Transaction } from '@stellar/stellar-sdk';

export interface UseSignTransactionResult {
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
        const result = await signWithFreighter(transaction.toXDR(), {
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

  return { signTransaction, signedXdr, isSigning, error, reset };
}
