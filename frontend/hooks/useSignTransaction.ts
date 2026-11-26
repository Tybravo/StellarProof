'use client';

import { useCallback, useRef, useState } from 'react';
import { getAddress, getNetworkDetails, isConnected, signTransaction as freighterSignTransaction } from '@stellar/freighter-api';
import { Networks, Transaction } from '@stellar/stellar-sdk';

export function transactionErrorMessage(cause: unknown) {
  return errorMessage(cause);
}

/** Signs an XDR with Freighter and normalises the response to a signed XDR string. */
export async function signWithFreighter(
  xdr: string,
  options: { address: string; networkPassphrase: string }
): Promise<string> {
  try {
    const result = await freighterSignTransaction(xdr, options);
    if (typeof result === 'string') return result;
    if (result.error) throw result.error;
    if (!result.signedTxXdr) throw new Error('Freighter returned no signed transaction.');
    return result.signedTxXdr;
  } catch (cause) {
    throw new Error(transactionErrorMessage(cause));
  }
}

function errorMessage(cause: unknown) {
  const error = cause as { code?: number; message?: string };
  const message = typeof cause === 'string' ? cause : typeof error?.message === 'string' ? error.message : '';
  if (error?.code === -4 || error?.code === 4001 || /reject|declin|cancel/i.test(message)) {
    return 'Freighter signing was declined. You can try again.';
  }
  return message || 'Freighter could not sign the transaction. Please try again.';
}

export interface UseSignTransactionResult {
  sign: (transaction: Transaction) => Promise<string>;
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

  const inFlight = useRef(false);
  const sign = useCallback(async (transaction: Transaction) => {
    if (inFlight.current) throw new Error('A signing request is already in progress.');
    inFlight.current = true;
    setIsSigning(true);
    setError(null);
    try {
      const networkPassphrase = transaction.networkPassphrase;
      const connected = await isConnected();
      if (connected.error) throw connected.error;
      if (!connected.isConnected) throw new Error('Connect your Freighter wallet before signing.');
      const wallet = await getAddress();
      if (wallet.error) throw wallet.error;
      if (wallet.address !== transaction.source) throw new Error('Select the transaction source account in Freighter.');
      const network = await getNetworkDetails();
      if (network.error) throw network.error;
      if (network.networkPassphrase !== networkPassphrase) throw new Error('Select the transaction network in Freighter.');
      const result = await freighterSignTransaction(transaction.toXDR(), { address: wallet.address, networkPassphrase });
      if (result.error) throw result.error;
      if (!result.signedTxXdr) throw new Error('Freighter returned no signed transaction.');
      return result.signedTxXdr;
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      throw new Error(message);
    } finally {
      inFlight.current = false;
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
        const result = await freighterSignTransaction(transaction.toXDR(), {
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
