'use client';

import { LoaderCircle, Radio, RefreshCw, WifiOff } from 'lucide-react';
import { useWizardStore } from '../store/wizard.store';

export interface VerificationProgressProps {
  isPolling: boolean;
  connectionState?: 'connected' | 'reconnecting' | 'offline';
  error?: string | null;
  onRetry?: () => void;
}

export default function VerificationProgress({
  isPolling,
  connectionState = 'connected',
  error,
  onRetry,
}: VerificationProgressProps) {
  const stage = useWizardStore((state) => state.verificationProgress.stage);
  const online = connectionState === 'connected';

  return (
    <section className="border-y border-gray-200 py-4 dark:border-gray-800" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-950 dark:text-white">{stage}</p>
          {error && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
        </div>
        <span
          role="status"
          className={`inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-semibold ${
            online
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {online ? <Radio className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isPolling ? (
            <><LoaderCircle className="h-4 w-4 animate-spin" /> Polling</>
          ) : online ? 'Connected' : 'Reconnecting'}
        </span>
      </div>
      {error && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-gray-900 px-3 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </section>
  );
}
