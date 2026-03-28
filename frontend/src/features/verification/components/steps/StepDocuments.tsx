'use client';

import { useWizardStore } from '../../store/wizard.store';
import {
  isValidAssetCode,
  isValidAmount,
  isValidSHA256,
} from '@/utils/validation';

export default function StepDocuments() {
  const { formData, updateFormData, setStepValid } = useWizardStore();

  const documents = formData.documents || {
    assetCode: '',
    amount: '',
    proofHash: '',
  };

  const handleChange = (field: string, value: string) => {
    const updated = {
      ...documents,
      [field]: value,
    };

    updateFormData('documents', updated);

    const valid =
      isValidAssetCode(updated.assetCode) &&
      isValidAmount(updated.amount) &&
      isValidSHA256(updated.proofHash);

    setStepValid(1, valid);
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={documents.assetCode}
        onChange={(e) => handleChange('assetCode', e.target.value)}
        placeholder="Asset Code"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white"
      />

      <input
        type="number"
        value={documents.amount}
        onChange={(e) => handleChange('amount', e.target.value)}
        placeholder="Amount"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white"
      />

      <input
        type="text"
        value={documents.proofHash}
        onChange={(e) => handleChange('proofHash', e.target.value)}
        placeholder="SHA256 Proof Hash"
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white"
      />
    </div>
  );
}