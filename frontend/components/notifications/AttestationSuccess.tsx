'use client';

import { CheckCircle2, ExternalLink, X } from 'lucide-react';

export interface AttestationSuccessProps {
  open: boolean;
  transactionHash?: string;
  explorerUrl?: string;
  onClose: () => void;
  onContinue?: () => void;
}

export default function AttestationSuccess({
  open,
  transactionHash,
  explorerUrl,
  onClose,
  onContinue,
}: AttestationSuccessProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="attestation-success-title"
        className="relative w-full max-w-md rounded-lg border border-emerald-200 bg-white p-6 shadow-xl dark:border-emerald-900 dark:bg-gray-950"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-600" aria-hidden="true" />
        <h2 id="attestation-success-title" className="text-xl font-semibold text-gray-950 dark:text-white">
          Attestation confirmed
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          The Oracle proof is recorded on Stellar and the certificate is ready to mint.
        </p>

        {transactionHash && (
          <div className="mt-5 border-y border-gray-200 py-3 dark:border-gray-800">
            <p className="text-xs font-medium uppercase text-gray-500">Transaction</p>
            <p className="mt-1 truncate font-mono text-sm text-gray-800 dark:text-gray-200">
              {transactionHash}
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 px-3 text-sm font-medium text-gray-700 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white"
            >
              View on Stellar <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={onContinue ?? onClose}
            className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Continue
          </button>
        </div>
      </section>
    </div>
  );
}
