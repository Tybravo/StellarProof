'use client';

import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';

export interface VerificationProgressProps {
  isPolling: boolean;
  hasTimedOut?: boolean;
  error?: string | null;
  onRetry: () => void;
}

export default function VerificationProgress({
  isPolling,
  hasTimedOut = false,
  error,
  onRetry,
}: VerificationProgressProps) {
  if (hasTimedOut || error) {
    return (
      <section
        role="alert"
        className="border-l-4 border-amber-500 bg-amber-50 px-4 py-4 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">
              {hasTimedOut ? 'Oracle confirmation timed out' : 'Oracle confirmation failed'}
            </h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
              {error ?? 'No attestation was detected within the expected confirmation window.'}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-amber-900 px-3 text-sm font-semibold text-white hover:bg-amber-800"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-16 items-center gap-3 border-y border-gray-200 py-4 dark:border-gray-800" aria-live="polite">
      {isPolling && <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        {isPolling ? 'Waiting for Oracle attestation' : 'Oracle polling is ready'}
      </span>
    </div>
  );
}
