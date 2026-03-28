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
    <div className="flex items-center p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => onFormatChange('json')}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
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
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
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