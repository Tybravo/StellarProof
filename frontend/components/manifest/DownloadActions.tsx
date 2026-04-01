'use client';

import React from 'react';

export interface DownloadActionsProps {
  /** The stringified JSON or XML content of the manifest */
  content: string;
  /** The currently selected format */
  format: 'json' | 'xml';
  /** True if the manifest is empty or failing validation */
  isDisabled: boolean;
}

export default function DownloadActions({
  content,
  format,
  isDisabled,
}: DownloadActionsProps) {
  const handleDownload = () => {
    if (isDisabled || !content) return;

    try {
      // 1. Determine correct MIME type
      const mimeType = format === 'json' ? 'application/json' : 'application/xml';

      // 2. Create the Blob
      const blob = new Blob([content], { type: mimeType });

      // 3. Generate timestamped filename (e.g., stellarproof-manifest-1708950000000.json)
      const timestamp = Date.now();
      const filename = `stellarproof-manifest-${timestamp}.${format}`;

      // 4. Create object URL and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = filename;
      
      // Append to body, click, and clean up safely
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Free up memory
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate download file:', error);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDisabled}
      className={`
        flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all duration-200
        ${isDisabled 
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' 
          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm hover:shadow-md'
        }
      `}
      aria-label={`Download manifest as ${format.toUpperCase()}`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Download {format.toUpperCase()}
    </button>
  );
}