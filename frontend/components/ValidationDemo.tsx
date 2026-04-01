import React, { useState } from 'react';
import { AdvancedInput } from './AdvancedInput';
import { ManifestAttachment } from '../features/verification/components/ManifestAttachment';
import { isValidSHA256, validateSHA256 } from '../utils/validation';

export const ValidationDemo: React.FC = () => {
  const [advancedInputValue, setAdvancedInputValue] = useState('');
  const [submittedHashes, setSubmittedHashes] = useState<string[]>([]);

  const handleHashSubmit = (hash: string) => {
    setSubmittedHashes(prev => [...prev, hash]);
    console.log('Submitted hash:', hash);
  };

  const testHashes = [
    { hash: 'a'.repeat(64), label: 'Valid (all lowercase a)' },
    { hash: 'A'.repeat(64), label: 'Valid (all uppercase A)' },
    { hash: '0'.repeat(64), label: 'Valid (all zeros)' },
    { hash: 'a'.repeat(63), label: 'Invalid (63 chars)' },
    { hash: 'a'.repeat(65), label: 'Invalid (65 chars)' },
    { hash: 'g'.repeat(64), label: 'Invalid (non-hex chars)' },
    { hash: '', label: 'Invalid (empty)' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          SHA256 Validation Utility Demo
        </h1>
        <p className="text-gray-600">
          Demonstrating the reusable SHA256 hash validation utility
        </p>
      </div>

      {/* AdvancedInput Component Demo */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">AdvancedInput Component</h2>
        <AdvancedInput
          value={advancedInputValue}
          onChange={setAdvancedInputValue}
          label="SHA256 Hash Input"
          placeholder="Enter a 64-character hexadecimal hash..."
        />
      </div>

      {/* ManifestAttachment Component Demo */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">ManifestAttachment Component</h2>
        <ManifestAttachment
          onHashSubmit={handleHashSubmit}
          label="Upload or Enter Manifest Hash"
        />
      </div>

      {/* Submitted Hashes */}
      {submittedHashes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Submitted Hashes</h2>
          <div className="space-y-2">
            {submittedHashes.map((hash, index) => (
              <div key={index} className="p-2 bg-green-50 border border-green-200 rounded">
                <code className="text-sm text-green-800 break-all">{hash}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Cases */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Test Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testHashes.map((testCase, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{testCase.label}</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isValidSHA256(testCase.hash)
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isValidSHA256(testCase.hash) ? 'Valid' : 'Invalid'}
                </span>
              </div>
              <code className="text-xs text-gray-600 break-all">
                {testCase.hash || '(empty)'}
              </code>
              {testCase.hash && validateSHA256(testCase.hash) && (
                <p className="text-xs text-red-600 mt-1">
                  {validateSHA256(testCase.hash)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Reference */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">API Reference</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-mono text-sm font-semibold">isValidSHA256(hash: string): boolean</h3>
            <p className="text-sm text-gray-600 mt-1">
              Returns true if the input is a valid 64-character hexadecimal SHA256 hash.
            </p>
          </div>
          <div>
            <h3 className="font-mono text-sm font-semibold">validateSHA256(hash: string): string | null</h3>
            <p className="text-sm text-gray-600 mt-1">
              Returns an error message if invalid, or null if valid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
