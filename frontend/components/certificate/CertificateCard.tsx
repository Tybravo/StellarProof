"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Copy,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  getCertificateVerificationUrl,
  type ProvenanceCertificate,
} from "@/services/certificate";
import { ExportActions, type CertificateData } from "./ExportActions";

export interface CertificateCardProps {
  /** The certificate returned by the chain/indexer data layer. */
  certificate: ProvenanceCertificate | null;
  /** Shows the card's loading skeleton while certificate data is requested. */
  isLoading?: boolean;
  /** A user-safe fetch error to render instead of stale certificate data. */
  error?: string | null;
  /** Allows the parent data layer to retry a failed request. */
  onRetry?: () => void;
}

export function CertificateCardSkeleton() {
  return (
    <div
      data-testid="certificate-card-skeleton"
      aria-busy="true"
      aria-label="Loading provenance certificate"
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-glow dark:border-gray-800 dark:bg-darkblue"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="space-y-4 border-t border-gray-100 pt-4 dark:border-gray-800">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 border-b border-gray-50 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800/50"
          >
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

function CertificateError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-white px-6 py-16 text-center shadow-glow dark:border-amber-900/50 dark:bg-darkblue"
    >
      <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden="true" />
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Unable to load certificate
        </h2>
        <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

function HashField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is optional; the full hash remains visible.
    }
  };

  return (
    <div className="flex flex-col gap-1 border-b border-gray-50 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800/50">
      <span className="shrink-0 font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="break-all font-mono text-xs text-gray-900 dark:text-gray-100">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`${copied ? "Copied" : "Copy"} ${label}`}
          className="shrink-0 text-gray-400 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-50 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800/50">
      <span className="font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="break-all font-mono text-xs text-gray-900 sm:text-sm dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}

function toCertificateData(certificate: ProvenanceCertificate): CertificateData {
  return {
    owner: certificate.ownerAddress,
    certificate_id: certificate.id,
    manifest_hash: certificate.manifestHash,
    content_hash: certificate.contentHash,
    attestation_hash: certificate.attestationHash,
    timestamp: certificate.mintedAt,
    network: "Stellar",
  };
}

export default function CertificateCard({
  certificate,
  isLoading = false,
  error,
  onRetry,
}: CertificateCardProps) {
  if (isLoading) return <CertificateCardSkeleton />;
  if (error) return <CertificateError message={error} onRetry={onRetry} />;

  if (!certificate) {
    return (
      <CertificateError
        message="No certificate data was returned for this ID. It may not have been minted yet."
        onRetry={onRetry}
      />
    );
  }

  const verificationUrl = getCertificateVerificationUrl(certificate.id);
  const mintedDate = new Date(certificate.mintedAt).toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <article
      aria-label="Provenance certificate"
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-glow dark:border-gray-800 dark:bg-darkblue"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-700 dark:bg-emerald-900/30">
            <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Verified on Stellar
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Provenance Certificate</h2>
        </div>
        <ExportActions certificate={toCertificateData(certificate)} />
      </header>

      <section
        aria-label="On-chain certificate identity"
        className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30"
      >
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              On-chain Certificate ID
            </p>
            <p
              data-testid="certificate-id"
              className="mt-1 break-all font-mono text-sm font-semibold text-blue-950 dark:text-blue-100"
            >
              {certificate.id}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-0 border-t border-gray-100 pt-2 text-sm dark:border-gray-800">
        <DetailRow label="Owner" value={certificate.ownerAddress} />
        <DetailRow label="Minted At" value={mintedDate} />
        <DetailRow label="Network" value="Stellar Testnet" />
        <HashField label="Manifest Hash" value={certificate.manifestHash} />
        <HashField label="Content Hash" value={certificate.contentHash} />
        <HashField label="Attestation Hash" value={certificate.attestationHash} />
      </section>

      <section className="flex flex-col items-center gap-3 pt-2" aria-label="Certificate verification QR code">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Scan to verify
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-md dark:border-white/10">
          <QRCodeSVG value={verificationUrl} size={140} level="M" includeMargin={false} />
        </div>
        <p className="max-w-xs break-all text-center text-xs text-gray-400 dark:text-gray-500">
          {verificationUrl}
        </p>
      </section>
    </article>
  );
}
