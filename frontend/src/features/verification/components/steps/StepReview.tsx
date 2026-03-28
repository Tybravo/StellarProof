'use client';

import { useWizardStore } from '../../store/wizard.store';

export default function StepReview() {
  const { formData } = useWizardStore();

  return (
    <div className="space-y-6 text-gray-700 dark:text-gray-300">
      <div>
        <h3 className="font-semibold mb-2">Identity</h3>
        <p>
          Issuer Address: {formData.identity?.issuerAddress || '—'}
        </p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Documents</h3>
        <p>Asset Code: {formData.documents?.assetCode || '—'}</p>
        <p>Amount: {formData.documents?.amount || '—'}</p>
        <p>Proof Hash: {formData.documents?.proofHash || '—'}</p>
      </div>
    </div>
  );
}