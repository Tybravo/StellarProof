"use client";

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download, FileText, Loader2 } from 'lucide-react';
import { CertificateTemplate } from './CertificateTemplate';

interface ExportActionsProps {
  certificateData: {
    id: string;
    contentHash: string;
    txHash: string;
    timestamp: string;
  };
}

export default function ExportActions({ certificateData }: ExportActionsProps) {
  const fileName = `stellarproof-certificate-${certificateData.id.slice(0, 8)}.pdf`;

  return (
    <div className="flex flex-wrap gap-4 mt-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <h4 className="text-sm font-semibold mb-1">Export Certificate</h4>
        <p className="text-xs text-gray-500">Download a verified PDF copy for your records.</p>
      </div>

      <PDFDownloadLink
        document={<CertificateTemplate data={certificateData} />}
        fileName={fileName}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
      >
        {({ loading }) => (
          <>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? "Preparing PDF..." : "Download PDF"}
          </>
        )}
      </PDFDownloadLink>

      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => alert("Preview feature coming soon!")}
      >
        <FileText className="w-4 h-4" />
        Preview
      </button>
    </div>
  );
}