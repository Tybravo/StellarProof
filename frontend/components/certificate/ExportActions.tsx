"use client";

import React from "react";

export interface CertificateData {
  owner: string;
  certificate_id: string;
  manifest_hash: string;
  content_hash: string;
  attestation_hash: string;
  timestamp: string | number;
  network: string;
}

interface ExportActionsProps {
  certificate: CertificateData | null;
  isLoading?: boolean;
}

export function ExportActions({ certificate, isLoading = false }: ExportActionsProps) {
  const handleDownloadJson = () => {
    if (!certificate) return;

    const exportData = {
      owner: certificate.owner,
      certificate_id: certificate.certificate_id,
      manifest_hash: certificate.manifest_hash,
      content_hash: certificate.content_hash,
      attestation_hash: certificate.attestation_hash,
      timestamp: certificate.timestamp,
      network: certificate.network,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `stellarproof-certificate-${certificate.certificate_id}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isDisabled = isLoading || !certificate;

  return (
    <div className="flex gap-4 items-center">
      <button
        onClick={handleDownloadJson}
        disabled={isDisabled}
        className={`px-4 py-2 rounded-md font-medium transition-colors ${
          isDisabled
            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
            : "bg-primary text-primary-foreground hover:bg-primary-light dark:bg-darkblue-light dark:hover:bg-primary"
        }`}
      >
        Download JSON
      </button>
    </div>
  );
}
