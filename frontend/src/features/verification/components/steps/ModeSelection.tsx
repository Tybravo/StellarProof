'use client';

import React, { useState } from 'react';
// Update this path to match your actual store location
import { useWizardStore } from '@/features/verification/store/wizard.store';

// Mock data array defining the modes per the PRD
const VERIFICATION_MODES = [
  {
    id: 'standard',
    title: 'Standard',
    description: 'Basic public verification on the Stellar network.',
    tooltip: 'Standard mode posts the asset hash publicly to the Stellar ledger for maximum transparency.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    id: 'spv',
    title: 'SPV (Secret Provenance)',
    description: 'Zero-knowledge verification for sensitive assets.',
    tooltip: 'SPV utilizes Soroban smart contracts to verify assets without revealing the underlying data.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Multi-signature and complex institutional compliance.',
    tooltip: 'Advanced mode requires multi-sig approval and outputs a compliance-ready XML/JSON manifest.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export default function ModeSelection() {
  const { formData, updateFormData, setStepValid } = useWizardStore();
  
  const [selectedMode, setSelectedMode] = useState<string | null>(
    formData.verification?.mode || null
  );

  const handleSelectMode = (modeId: string) => {
    setSelectedMode(modeId);
    
    updateFormData('verification', { mode: modeId });
    
    setStepValid(0, true);
  };

  return (
    <div className="space-y-6">
      {!selectedMode && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          Please select a verification mode to proceed.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VERIFICATION_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;

          return (
            <div
              key={mode.id}
              onClick={() => handleSelectMode(mode.id)}
              className={`
                relative group cursor-pointer rounded-xl border-2 p-6 transition-all duration-200
                ${isSelected 
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm bg-white dark:bg-gray-800'
                }
              `}
            >
              {/* Checkmark Badge for Selected State */}
              {isSelected && (
                <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-1 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Icon */}
              <div className={`mb-4 inline-flex p-3 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {mode.icon}
              </div>

              {/* Text Content */}
              <h3 className={`text-lg font-bold mb-2 ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                {mode.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                {mode.description}
              </p>

              {/* Tooltip implementation using group-hover */}
              <div className="absolute bottom-4 right-4 cursor-help">
                <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {/* Tooltip Box */}
                <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg transition-all duration-200 z-10 pointer-events-none">
                  {mode.tooltip}
                  <div className="absolute -bottom-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}