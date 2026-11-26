'use client';

import { useCallback } from 'react';
import { useWizardStore, type MintedCertificate } from '../store/wizard.store';

/**
 * Connects a minting flow to the wizard store.
 *
 * `runMint` accepts any async mint function (for example one built from the
 * Soroban `mint` transaction hook plus Freighter signing), drives the store
 * through Minting -> Minted, and on failure keeps the wizard data so the user
 * can retry.
 */
export function useMintState() {
  const applicationStatus = useWizardStore((s) => s.applicationStatus);
  const mintedCertificate = useWizardStore((s) => s.mintedCertificate);
  const mintError = useWizardStore((s) => s.mintError);
  const startMint = useWizardStore((s) => s.startMint);
  const failMint = useWizardStore((s) => s.failMint);
  const completeMint = useWizardStore((s) => s.completeMint);

  const runMint = useCallback(
    async (mint: () => Promise<MintedCertificate>): Promise<MintedCertificate | null> => {
      startMint();
      try {
        const certificate = await mint();
        completeMint(certificate);
        return certificate;
      } catch (err) {
        failMint(err instanceof Error ? err.message : 'Minting failed. Please try again.');
        return null;
      }
    },
    [startMint, failMint, completeMint]
  );

  return {
    applicationStatus,
    isMinting: applicationStatus === 'Minting',
    isMinted: applicationStatus === 'Minted',
    mintedCertificate,
    mintError,
    runMint,
  };
}
