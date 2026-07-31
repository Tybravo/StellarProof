'use client';

import React, { useCallback, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Globe, KeyRound, Check, HelpCircle, Info } from 'lucide-react';
import { useWizardStore } from '../../store/wizard.store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const PRIVACY_TOOLTIPS = {
  public:
    'Public keeps the provenance record readable on-chain so anyone can inspect and verify it instantly.',
  encrypted:
    'KMS Encrypted seals the provenance payload before submission so only authorized viewers can decrypt it.',
};

export default function SPVPrivacyStep() {
  const { formData, setEncryptionEnabled, setStepValid } = useWizardStore();
  
  // Default to KMS Encrypted (true) as in the store defaults
  const encryptionEnabled = formData.content?.encryptionEnabled ?? true;

  // Mark step 2 as valid automatically so users can navigate next
  useEffect(() => {
    setStepValid(2, true);
  }, [setStepValid]);

  const selectPublic = useCallback(() => {
    setEncryptionEnabled(false);
  }, [setEncryptionEnabled]);

  const selectEncrypted = useCallback(() => {
    setEncryptionEnabled(true);
  }, [setEncryptionEnabled]);

  const handleToggle = useCallback(() => {
    setEncryptionEnabled(!encryptionEnabled);
  }, [encryptionEnabled, setEncryptionEnabled]);

  const handleOptionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>, nextValue: boolean) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setEncryptionEnabled(nextValue);
      }
    },
    [setEncryptionEnabled],
  );

  return (
    <TooltipProvider>
      <div className="w-full max-w-2xl mx-auto space-y-8 py-2">
      {/* Intro info header */}
      <div className="text-center space-y-2 mb-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Choose how your provenance data is secured and registered on the blockchain network.
        </p>
      </div>

      {/* Main Grid Options */}
      <div 
        role="radiogroup" 
        aria-label="Privacy Select" 
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* PUBLIC REGISTRY CARD */}
        <div
          role="radio"
          aria-checked={!encryptionEnabled}
          tabIndex={0}
          onClick={selectPublic}
          onKeyDown={(event) => handleOptionKeyDown(event, false)}
          className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 cursor-pointer ${
            !encryptionEnabled
              ? 'border-primary bg-primary/[0.03] dark:bg-primary/[0.01] shadow-glow'
              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
          }`}
        >
          {/* Active selection dot */}
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              !encryptionEnabled 
                ? 'border-primary bg-primary text-white scale-100' 
                : 'border-gray-300 dark:border-gray-600 bg-transparent scale-90'
            }`}>
              {!encryptionEnabled && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
              !encryptionEnabled
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }`}>
              <Globe className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Public Registry
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Explain Public Registry privacy option"
                      className="rounded-full text-gray-400 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {PRIVACY_TOOLTIPS.public}
                  </TooltipContent>
                </Tooltip>
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Standard On-Chain Storage
              </p>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your provenance record is stored in plaintext. Anyone can verify the asset history and authenticity directly on the public ledger.
            </p>

            {/* Feature spec list */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 space-y-2 mt-auto font-sans text-[11px] text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Verification State</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Public & Instant</span>
              </div>
              <div className="flex justify-between">
                <span>Access Requirement</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">None (Open)</span>
              </div>
              <div className="flex justify-between">
                <span>KMS Integration</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">None</span>
              </div>
            </div>
          </div>
        </div>

        {/* KMS ENCRYPTED CARD */}
        <div
          role="radio"
          aria-checked={encryptionEnabled}
          tabIndex={0}
          onClick={selectEncrypted}
          onKeyDown={(event) => handleOptionKeyDown(event, true)}
          className={`flex flex-col text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 cursor-pointer ${
            encryptionEnabled
              ? 'border-primary bg-primary/[0.03] dark:bg-primary/[0.01] shadow-glow'
              : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
          }`}
        >
          {/* Active selection dot */}
          <div className="absolute top-4 right-4 flex items-center justify-center">
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
              encryptionEnabled 
                ? 'border-primary bg-primary text-white scale-100' 
                : 'border-gray-300 dark:border-gray-600 bg-transparent scale-90'
            }`}>
              {encryptionEnabled && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
          </div>

          <div className="space-y-4 flex-1">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl transition-colors ${
              encryptionEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'
            }`}>
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                KMS Encrypted
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Explain KMS Encrypted privacy option"
                      className="rounded-full text-gray-400 transition hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {PRIVACY_TOOLTIPS.encrypted}
                  </TooltipContent>
                </Tooltip>
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Sealed Provenance Vault
              </p>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Encrypt the content hash locally client-side before submission. Access is secured using Key Management Service (KMS) with configurable decryption rights.
            </p>

            {/* Feature spec list */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 space-y-2 mt-auto font-sans text-[11px] text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Verification State</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Authorized Access</span>
              </div>
              <div className="flex justify-between">
                <span>Access Requirement</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Decryption Key Auths</span>
              </div>
              <div className="flex justify-between">
                <span>KMS Integration</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">Stellar KMS Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Toggle Switch & Description */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 gap-4">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-gray-400 shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-gray-750 dark:text-gray-200">
              {encryptionEnabled ? 'Vault Encryption Enabled' : 'Registry Mode: Public'}
            </h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Toggle to quickly switch the target privacy layout.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={encryptionEnabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900 cursor-pointer ${
            encryptionEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
              encryptionEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Callouts based on selections */}
      {encryptionEnabled ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-900/40">
          <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-green-700 dark:text-green-300">
              Safe Provenance Active
            </h4>
            <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
              Your hash data will be encrypted in your browser using a unique KMS key. Your plaintext files and content hashes are never exposed to public viewers.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-250/60 dark:border-yellow-905/40">
          <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 font-sans">
              Plaintext Storage Warning
            </h4>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
              Without encryption, any observer with access to the blockchain history can verify the exact file matches. Do not publish hashes containing highly confidential metadata.
            </p>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
