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

  const inputClass =
    "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="doc-asset-code" className="block text-sm font-medium text-gray-900 dark:text-white">
          Asset Code
        </label>
        <input
          id="doc-asset-code"
          type="text"
          value={documents.assetCode}
          onChange={(e) => handleChange('assetCode', e.target.value)}
          placeholder="e.g. USDC"
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="doc-amount" className="block text-sm font-medium text-gray-900 dark:text-white">
          Amount
        </label>
        <input
          id="doc-amount"
          type="number"
          value={documents.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          placeholder="e.g. 5000.00"
          min="0"
          step="any"
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="doc-proof-hash" className="block text-sm font-medium text-gray-900 dark:text-white">
          SHA256 Proof Hash
        </label>
        <input
          id="doc-proof-hash"
          type="text"
          value={documents.proofHash}
          onChange={(e) => handleChange('proofHash', e.target.value)}
          placeholder="64-character hex string"
          autoComplete="off"
          spellCheck={false}
          maxLength={64}
          className={inputClass}
        />
      </div>
    </div>
  );
}