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

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">
        Issuer Address (Stellar Public Key)
      </label>

      <input
        type="text"
        value={issuerAddress}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="G..."
        className="w-full rounded-lg border px-4 py-2"
      />

      {!isValid && issuerAddress.length > 0 && (
        <p className="text-sm text-red-500">
          Invalid Stellar address format.
        </p>
      )}
    </div>
  );
}