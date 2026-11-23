'use client';

import { useCallback, useRef, useState } from 'react';
import { getAddress, getNetworkDetails, isConnected, signTransaction } from '@stellar/freighter-api';
import type { Transaction } from '@stellar/stellar-sdk';

function errorMessage(cause: unknown) {
  const error = cause as { code?: number; message?: string };
  const message = typeof cause === 'string' ? cause : typeof error?.message === 'string' ? error.message : '';
  if (error?.code === -4 || error?.code === 4001 || /reject|declin|cancel/i.test(message)) {
    return 'Freighter signing was declined. You can try again.';
  }
  return message || 'Freighter could not sign the transaction. Please try again.';
}

export function useSignTransaction() {
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
      const result = await signTransaction(transaction.toXDR(), { address: wallet.address, networkPassphrase });
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
  return { sign, isSigning, error };
}
