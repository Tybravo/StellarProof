'use client';

import { useWizardStore } from '@/features/verification/store/wizard.store';
import HashDisplay from './HashDisplay';
import ManualVerifier from './ManualVerifier';

export default function SpvResultsPanel() {
  const result = useWizardStore((state) => state.formData.content?.spvResult);

  if (!result?.contentHashHex || !result.manifestHashHex) {
    return (
      <p className="border-y border-gray-200 py-5 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
        SPV proof data is not available yet.
      </p>
    );
  }

  return (
    <section aria-label="SPV proof results">
      <HashDisplay contentHashHex={result.contentHashHex} manifestHashHex={result.manifestHashHex} />
      {result.signatureHex && result.providerPublicKeyHex && (
        <ManualVerifier
          contentHashHex={result.contentHashHex}
          signatureHex={result.signatureHex}
          publicKeyHex={result.providerPublicKeyHex}
        />
      )}
    </section>
  );
}
