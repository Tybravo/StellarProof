"use client";

import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ExportActions, CertificateData } from "./ExportActions";
import {
  fetchCertificate,
  getCertificateVerificationUrl,
  ProvenanceCertificate,
} from "@/services/certificate";

interface CertificateViewProps {
  certificateId: string;
}

function CertificateSkeleton() {
  return (
    <div className="p-6 bg-white dark:bg-darkblue rounded-lg shadow-glow space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-50 dark:border-gray-800/50 gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 pt-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-36 w-36 rounded-xl" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

function HashField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — silent fail
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-50 dark:border-gray-800/50 gap-1">
      <span className="font-medium text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all">
          {value}
        </span>
        <button
          onClick={handleCopy}
          title="Copy full hash"
          className="text-gray-400 hover:text-primary dark:hover:text-primary-light transition-colors shrink-0"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function toCertificateData(cert: ProvenanceCertificate): CertificateData {
  return {
    owner: cert.ownerAddress,
    certificate_id: cert.id,
    manifest_hash: cert.manifestHash,
    content_hash: cert.contentHash,
    attestation_hash: cert.attestationHash,
    timestamp: cert.mintedAt,
    network: "Stellar",
  };
}

export function CertificateView({ certificateId }: CertificateViewProps) {
  const [certificate, setCertificate] = useState<ProvenanceCertificate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

    load();
    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  if (loading) return <CertificateSkeleton />;

  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-darkblue rounded-lg shadow-glow flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Certificate Not Found
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">{error}</p>
      </div>
    );
  }

  if (!certificate) return null;

  const verificationUrl = getCertificateVerificationUrl(certificate.id);
  const mintedDate = new Date(certificate.mintedAt).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="p-6 bg-white dark:bg-darkblue rounded-lg shadow-glow space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700">
            <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 tracking-wide uppercase">
              Verified
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Provenance Certificate
          </h2>
        </div>
        <ExportActions certificate={toCertificateData(certificate)} isLoading={false} />
      </div>

      <div className="space-y-0 border-t border-gray-100 dark:border-gray-800 text-sm">
        <DetailRow label="Certificate ID" value={certificate.id} />
        <DetailRow label="Owner" value={certificate.ownerAddress} />
        <DetailRow label="Minted At" value={mintedDate} />
        <DetailRow label="Network" value="Stellar" />
        <HashField label="Manifest Hash" value={certificate.manifestHash} />
        <HashField label="Content Hash" value={certificate.contentHash} />
        <HashField label="Attestation Hash" value={certificate.attestationHash} />
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
          Scan to verify
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-white/10 p-3 bg-white shadow-md">
          <QRCodeSVG value={verificationUrl} size={140} level="M" includeMargin={false} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 break-all text-center max-w-xs">
          {verificationUrl}
        </p>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 border-b border-gray-50 dark:border-gray-800/50 gap-1">
      <span className="font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-900 dark:text-gray-100 font-mono text-xs sm:text-sm mt-1 sm:mt-0 break-all">
        {value}
      </span>
    </div>
  );
}

export default CertificateView;
