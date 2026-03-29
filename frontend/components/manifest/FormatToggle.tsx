'use client';

import React from 'react';

export type ManifestFormat = 'json' | 'xml';

interface FormatToggleProps {
  currentFormat: ManifestFormat;
  onFormatChange: (format: ManifestFormat) => void;
}

export const FormatToggle: React.FC<FormatToggleProps> = ({ 
  currentFormat, 
  onFormatChange 
}) => {
  return (
    <div
      role="group"
      aria-label="Select output format"
      className="flex items-center p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit border border-gray-200 dark:border-gray-700"
    >
      <button
        type="button"
        onClick={() => onFormatChange('json')}
        aria-pressed={currentFormat === 'json'}
        aria-label="JSON format"
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          currentFormat === 'json'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        JSON
      </button>
      <button
        type="button"
        onClick={() => onFormatChange('xml')}
        aria-pressed={currentFormat === 'xml'}
        aria-label="XML format"
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          currentFormat === 'xml'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        XML
      </button>
    </div>
  );
};