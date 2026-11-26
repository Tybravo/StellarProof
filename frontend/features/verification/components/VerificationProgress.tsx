'use client';

import { Loader2 } from 'lucide-react';
import { useSpvUpdates, SpvStatus } from '@/hooks/useSpvUpdates';

const labels: Record<SpvStatus, string> = {
  pending: 'Waiting for a worker', processing: 'Processing media',
  tee_verifying: 'Verifying proof', minting: 'Issuing certificate',
  completed: 'Verification complete', failed: 'Verification failed',
};

export function VerificationProgress({ streamUrl }: { streamUrl?: string }) {
  const { update, connection, error } = useSpvUpdates(streamUrl);
  const status = update?.status;
  const busy = status !== 'completed' && status !== 'failed';
  return (
    <section aria-label="Verification progress" aria-busy={busy}
      className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <div role="status" aria-live="polite" className="flex items-center gap-3">
        {busy && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-600 motion-reduce:animate-none" />}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {status ? labels[status] : 'Verification in progress'}
        </h2>
      </div>
      {busy && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {connection === 'idle' ? 'Waiting for a verification job.' :
          connection === 'connecting' ? 'Connecting to processing updates…' : 'Your request is being processed.'}
      </p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{error.message}</p>}
      {status === 'failed' && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
        Processing failed. Review the request before retrying.
      </p>}
    </section>
  );
}
