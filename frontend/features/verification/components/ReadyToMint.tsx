'use client';

import { useCallback, useRef, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, Send } from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import { useWizardStore } from '../store/wizard.store';
import {
  submitVerificationRequest,
  VerificationSubmissionError,
  type SubmissionFailureKind,
} from '@/services/verificationService';

export interface ReadyToMintProps {
  contentHash: string;
  manifestHash: string | null;
  /** Whether the verified content hash is valid and can be submitted. */
  isReady: boolean;
}

interface MintFailure {
  message: string;
  kind: SubmissionFailureKind;
}

const FAILURE_COPY: Record<SubmissionFailureKind, { title: string; hint: string }> = {
  user_rejected: {
    title: 'Signing request declined',
    hint: 'No transaction was sent. Approve the request in Freighter when you are ready to try again.',
  },
  network: {
    title: 'Network unavailable',
    hint: 'We could not reach the Stellar network. Check your connection and try again.',
  },
  on_chain: {
    title: 'Transaction failed on-chain',
    hint: 'The network rejected the mint transaction, so your content was not recorded. Try again when ready.',
  },
  configuration: {
    title: 'Minting is not configured',
    hint: 'The contract settings for this environment are missing. Contact support if this persists.',
  },
  unknown: {
    title: 'Minting failed',
    hint: 'Something went wrong while minting. You can try again or start over.',
  },
};

export function MintFailureNotice({
  failure,
  onRetry,
  onReset,
}: {
  failure: MintFailure;
  onRetry: () => void;
  onReset: () => void;
}) {
  const copy = FAILURE_COPY[failure.kind];

  return (
    <div role="alert" className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">{copy.title}</h3>
          <p className="text-xs text-red-700 dark:text-red-300">{copy.hint}</p>
          <p
            className="break-words font-mono text-xs text-red-700 dark:text-red-300"
            data-testid="mint-error-message"
          >
            {failure.message}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

/** Final confirmation and mint action for the verified payload. */
export default function ReadyToMint({
  contentHash,
  manifestHash,
  isReady,
}: ReadyToMintProps) {
  const {
    isSubmitting,
    submissionResult,
    submissionError,
    setIsSubmitting,
    setSubmissionResult,
    setSubmissionError,
    resetWizard,
  } = useWizardStore();

  const [confirmed, setConfirmed] = useState(false);
  const [failureKind, setFailureKind] = useState<SubmissionFailureKind>('unknown');
  const lockRef = useRef(false);

  const canSubmit = isReady && confirmed && !isSubmitting && !submissionResult;

  const handleMint = useCallback(async () => {
    if (!canSubmit || lockRef.current) return;

    lockRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const walletStatus = await isConnected();
      const connected =
        typeof walletStatus === 'boolean'
          ? walletStatus
          : Boolean((walletStatus as { isConnected?: boolean }).isConnected);

      if (!connected) {
        throw new VerificationSubmissionError(
          'Wallet not connected. Please connect your Freighter wallet to continue.',
        );
      }

      const accessResponse = await requestAccess();
      if (accessResponse.error) {
        throw new VerificationSubmissionError(
          `Freighter error: ${accessResponse.error}`,
          'user_rejected',
        );
      }

      const activePublicKey = accessResponse.address;
      if (!activePublicKey) {
        throw new VerificationSubmissionError(
          'Unable to retrieve public key from Freighter wallet.',
        );
      }

      const result = await submitVerificationRequest(contentHash, manifestHash, activePublicKey);
      setSubmissionResult({ ...result, timestamp: new Date().toISOString() });
    } catch (error) {
      const failure = error instanceof VerificationSubmissionError ? error : null;
      setFailureKind(failure?.kind ?? 'unknown');
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    contentHash,
    manifestHash,
    setIsSubmitting,
    setSubmissionError,
    setSubmissionResult,
  ]);

  if (submissionError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <MintFailureNotice
          failure={{ message: submissionError, kind: failureKind }}
          onRetry={() => setSubmissionError(null)}
          onReset={resetWizard}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ready to mint</h3>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Your verified data is ready to be recorded on the Stellar network.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={isSubmitting}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
        />
        <span className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          I confirm that the information above is correct and authorise minting this certificate on the Stellar network.
        </span>
      </label>

      <button
        type="button"
        onClick={handleMint}
        disabled={!canSubmit}
        aria-busy={isSubmitting}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          canSubmit
            ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95'
            : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Minting certificate…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Mint Certificate
          </>
        )}
      </button>
    </div>
  );
}
