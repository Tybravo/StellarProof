"use client";

import React, { useEffect, useState } from "react";
import { ExportActions, CertificateData } from "./ExportActions";
import { fetchMockCertificate } from "@/services/certificateMock";

interface CertificateViewProps {
  certificateId: string;
}

export function CertificateView({ certificateId }: CertificateViewProps) {
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadCertificate = async () => {
      setLoading(true);
      try {
        const data = await fetchMockCertificate(certificateId);
        setCertificate(data);
      } catch (error) {
        console.error("Failed to load certificate", error);
      } finally {
        setLoading(false);
      }
    };

    loadCertificate();
  }, [certificateId]);

  return (
    <div className="p-6 bg-white dark:bg-darkblue rounded-lg shadow-glow dark:shadow-glow-dark">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Provenance Certificate
        </h2>
        {/* Integration with CertificateView component  */}
        <ExportActions certificate={certificate} isLoading={loading} />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      ) : certificate ? (
        <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4 text-sm">
          <DetailRow label="Owner" value={certificate.owner} />
          <DetailRow label="Certificate ID" value={certificate.certificate_id} />
          <DetailRow label="Manifest Hash" value={certificate.manifest_hash} />
          <DetailRow label="Content Hash" value={certificate.content_hash} />
          <DetailRow label="Attestation Hash" value={certificate.attestation_hash} />
          <DetailRow label="Timestamp" value={String(certificate.timestamp)} />
          <DetailRow label="Network" value={certificate.network} />
        </div>
      ) : (
        <div className="text-red-500">Failed to load certificate data.</div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-50 dark:border-gray-800/50">
      <span className="font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-gray-100 font-mono text-xs sm:text-sm mt-1 sm:mt-0 break-all">
        {value}
      </span>
    </div>
  );
}
