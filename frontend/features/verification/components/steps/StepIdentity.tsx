'use client';

import { useState, useMemo } from 'react';
import { useWizardStore } from '../../store/wizard.store';
import { isValidStellarAddress } from '@/utils/validation';

export default function StepIdentity() {
  const { formData, updateFormData, setStepValid } = useWizardStore();

  const [issuerAddress, setIssuerAddress] = useState(
    formData.identity?.issuerAddress || ''
  );

  const isValid = useMemo(
    () => isValidStellarAddress(issuerAddress),
    [issuerAddress]
  );

  const handleChange = (value: string) => {
    setIssuerAddress(value);
    updateFormData('identity', { issuerAddress: value });
    setStepValid(0, isValidStellarAddress(value));
  };

  const errorId = "issuer-address-error";
  const hasError = !isValid && issuerAddress.length > 0;

  return (
    <div className="space-y-2">
      <label
        htmlFor="issuer-address"
        className="block text-sm font-medium text-gray-900 dark:text-white"
      >
        Issuer Address (Stellar Public Key)
      </label>

      <input
        id="issuer-address"
        type="text"
        value={issuerAddress}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="G..."
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        autoComplete="off"
        spellCheck={false}
        className={`w-full rounded-lg border px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
          hasError
            ? "border-red-500 dark:border-red-400"
            : "border-gray-300 dark:border-gray-700"
        }`}
      />

      {hasError && (
        <p id={errorId} role="alert" className="text-sm text-red-500 dark:text-red-400">
          Invalid Stellar address format.
        </p>
      )}
    </div>
  );
}