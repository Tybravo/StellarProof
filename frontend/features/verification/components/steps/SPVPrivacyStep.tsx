'use client';

import React from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { useWizardStore } from '../../store/wizard.store';

export default function SPVPrivacyStep() {
  const { formData, setEncryptionEnabled } = useWizardStore();
  const encryptionEnabled = formData.content?.encryptionEnabled ?? true;

  const handlePrivacyToggle = (mode: 'public' | 'kms') => {
    setEncryptionEnabled(mode === 'kms');
  };

  return (
    <div className="flex flex-col gap-4" role="radiogroup" aria-label="Privacy Options">
      <h2 className="text-lg font-semibold">Privacy Options</h2>

      <div
        role="button"
        tabIndex={0}
        aria-pressed={!encryptionEnabled}
        onClick={() => handlePrivacyToggle('public')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePrivacyToggle('public');
          }
        }}
        className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          !encryptionEnabled
            ? 'bg-blue-50 border-blue-500'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
            <ShieldOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Public</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Hash data is stored in plaintext on the public ledger.
            </p>
          </div>
        </div>
        <input
          type="radio"
          name="privacyMode"
          value="public"
          checked={!encryptionEnabled}
          onChange={() => handlePrivacyToggle('public')}
          className="hidden"
        />
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-pressed={encryptionEnabled}
        onClick={() => handlePrivacyToggle('kms')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePrivacyToggle('kms');
          }
        }}
        className={`flex items-center justify-between cursor-pointer rounded-xl border p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          encryptionEnabled
            ? 'bg-blue-50 border-blue-500'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40">
            <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              KMS Encrypted
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Hash data is encrypted client-side before storage.
            </p>
          </div>
        </div>
        <input
          type="radio"
          name="privacyMode"
          value="kms"
          checked={encryptionEnabled}
          onChange={() => handlePrivacyToggle('kms')}
          className="hidden"
        />
      </div>
    </div>
  );
}