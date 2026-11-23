'use client';

import { useCallback, useState } from 'react';
import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';

const DEFAULT_RPC_URL = 'https://soroban-testnet.stellar.org';

export interface MintCertificateInput {
  ownerAddress: string;
  storageId: string;
  manifestHashHex: string;
  attestationHashHex: string;
}

export interface UseBuildMintTxResult {
  buildMintTransaction: (input: MintCertificateInput) => Promise<Transaction | null>;
  transaction: Transaction | null;
  isBuilding: boolean;
  error: string | null;
  reset: () => void;
}

function certificateDetails(input: MintCertificateInput): xdr.ScVal {
  const values: Array<[string, string]> = [
    ['attestation_hash', input.attestationHashHex],
    ['manifest_hash', input.manifestHashHex],
    ['storage_id', input.storageId],
  ];

  return xdr.ScVal.scvMap(
    values.map(
      ([key, value]) =>
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol(key),
          val: xdr.ScVal.scvString(value),
        })
    )
  );
}

export function useBuildMintTx(
  contractId = process.env.NEXT_PUBLIC_VITE_PROVENANCE_CONTRACT_ID ?? '',
  rpcUrl = process.env.NEXT_PUBLIC_VITE_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL,
  networkPassphrase = process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET
): UseBuildMintTxResult {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTransaction(null);
    setError(null);
  }, []);

  const buildMintTransaction = useCallback(
    async (input: MintCertificateInput): Promise<Transaction | null> => {
      setIsBuilding(true);
      setError(null);
      setTransaction(null);

      try {
        if (!contractId) throw new Error('The Provenance contract is not configured.');
        if (!/^[0-9a-f]{64}$/i.test(input.manifestHashHex)) {
          throw new Error('Manifest hash must be a 32-byte hexadecimal value.');
        }
        if (!/^[0-9a-f]{64}$/i.test(input.attestationHashHex)) {
          throw new Error('Attestation hash must be a 32-byte hexadecimal value.');
        }

        const server = new rpc.Server(rpcUrl);
        const source = await server.getAccount(input.ownerAddress);
        const contract = new Contract(contractId);
        const built = new TransactionBuilder(source, {
          fee: BASE_FEE,
          networkPassphrase,
        })
          .addOperation(
            contract.call(
              'mint',
              Address.fromString(input.ownerAddress).toScVal(),
              certificateDetails(input)
            )
          )
          .setTimeout(60)
          .build();
        const prepared = await server.prepareTransaction(built);
        setTransaction(prepared);
        return prepared;
      } catch (buildError) {
        setError(
          buildError instanceof Error ? buildError.message : 'Unable to construct the mint transaction.'
        );
        return null;
      } finally {
        setIsBuilding(false);
      }
    },
    [contractId, networkPassphrase, rpcUrl]
  );

  return { buildMintTransaction, transaction, isBuilding, error, reset };
}
