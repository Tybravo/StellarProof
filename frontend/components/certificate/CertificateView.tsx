"use client";

import { useEffect, useState } from "react";
import CertificateCard from "./CertificateCard";
import { fetchCertificate, type ProvenanceCertificate } from "@/services/certificate";

interface CertificateViewProps {
  certificateId: string;
}

/**
 * Loads the chain/indexer record and delegates certificate presentation to
 * CertificateCard. Keeping the request here leaves the card reusable for
 * dashboard, search, and post-mint screens that already have certificate data.
 */
export function CertificateView({ certificateId }: CertificateViewProps) {
  const [certificate, setCertificate] = useState<ProvenanceCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setCertificate(null);

      const result = await fetchCertificate(certificateId);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
      } else {
        setCertificate(result.data ?? null);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [certificateId, reloadKey]);

  return (
    <CertificateCard
      certificate={certificate}
      isLoading={loading}
      error={error}
      onRetry={() => setReloadKey((key) => key + 1)}
    />
  );
}

export default CertificateView;
