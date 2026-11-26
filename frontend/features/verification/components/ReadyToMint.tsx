'use client';

import React, { useCallback, useRef, useState } from 'react';
import { AlertCircle, Loader2, RotateCcw, Send } from 'lucide-react';
import { isConnected, requestAccess } from '@stellar/freighter-api';
import { useWizardStore } from '../store/wizard.store';
import {
  submitVerificationRequest,
  VerificationSubmissionError,
  type SubmissionFailureKind,
} from '@/services/verificationService';
import { MINTING_UNAVAILABLE_MESSAGE, WALLET_MINTING_ENABLED } from '@/config/minting';

export interface ReadyToMintProps {
  contentHash: string;
  manifestHash: string | null;
  /** Whether the content hash is valid and minting may be attempted. */
  isReady: boolean;
  /** Called when Freighter signing starts or ends. */
  onSigningChange?: (signing: boolean) => void;
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
    hint: 'The network rejected the mint transaction, so your content was not recorded. Review the details below and try again.',
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
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">{copy.title}</h3>
          <p className="text-xs text-red-700 dark:text-red-300">{copy.hint}</p>
          <p className="break-words font-mono text-xs text-red-700 dark:text-red-300" data-testid="mint-error-message">
            {failure.message}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRetry}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

/**
 * Final confirmation + mint action. Owns the wallet/sign/submit sequence and
 * shows a recoverable error UI if any part of the mint transaction fails.
 */
export default function ReadyToMint({
  contentHash,
  manifestHash,
  isReady,
  onSigningChange,
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

  const canSubmit =
    WALLET_MINTING_ENABLED && isReady && confirmed && !isSubmitting && !submissionResult;

  const handleMint = useCallback(async () => {
    if (!canSubmit || lockRef.current) return;

    lockRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const walletConnected = await isConnected();
      if (!walletConnected) {
        throw new VerificationSubmissionError(
          'Wallet not connected. Please connect your Freighter wallet to continue.',
          'unknown'
        );
      }

      const accessResponse = await requestAccess();
      if (accessResponse.error) {
        throw new VerificationSubmissionError(`Freighter error: ${accessResponse.error}`, 'user_rejected');
      }

      const activePublicKey = accessResponse.address;
      if (!activePublicKey) {
        throw new VerificationSubmissionError('Unable to retrieve public key from Freighter wallet.', 'unknown');
      }

      const result = await submitVerificationRequest(
        contentHash,
        manifestHash,
        activePublicKey,
        onSigningChange
      );
      setSubmissionResult({ ...result, timestamp: new Date().toISOString() });
    } catch (error) {
      setFailureKind(error instanceof VerificationSubmissionError ? error.kind : 'unknown');
      setSubmissionError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      onSigningChange?.(false);
      lockRef.current = false;
      setIsSubmitting(false);
    }
  }, [canSubmit, contentHash, manifestHash, onSigningChange, setIsSubmitting, setSubmissionResult, setSubmissionError]);

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
      {!WALLET_MINTING_ENABLED && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="text-xs text-amber-800 dark:text-amber-200">{MINTING_UNAVAILABLE_MESSAGE}</p>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={!WALLET_MINTING_ENABLED || isSubmitting}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
        />
        <span className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          I confirm that the information above is correct and I authorise the submission to the Stellar network.
        </span>
      </label>

      <button
        type="button"
        onClick={handleMint}
        disabled={!canSubmit}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
          canSubmit
            ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95'
            : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Submit Record
          </>
        )}
      </button>
    </div>
  );
}
