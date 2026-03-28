'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTransactionStatus, getExplorerUrl, TxStatus } from '../../services/transactionService';
import { useToast } from '../../../app/context/ToastContext';

export interface TransactionTrackerProps {
  hash: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
  onStatusChange?: (status: TxStatus) => void;
}

const DEFAULT_INTERVAL = 5_000;
const DEFAULT_TIMEOUT = 120_000;

function TransactionTrackerInner({
  hash,
  pollIntervalMs = DEFAULT_INTERVAL,
  timeoutMs = DEFAULT_TIMEOUT,
  onStatusChange,
}: TransactionTrackerProps) {
  const [status, setStatus] = useState<TxStatus>('PENDING');
  const [ledger, setLedger] = useState<number | undefined>();
  const [timedOut, setTimedOut] = useState(false);
  const { addToast } = useToast();

  const prevStatus = useRef<TxStatus | null>(null);
  const stopped = useRef(false);

  const poll = useCallback(async () => {
    if (stopped.current) return;
    try {
      const result = await fetchTransactionStatus(hash);
      setStatus(result.status);
      setLedger(result.ledger);

      if (result.status !== prevStatus.current) {
        prevStatus.current = result.status;
        onStatusChange?.(result.status);

        if (result.status === 'CONFIRMED') {
          addToast('Transaction confirmed!', 'success');
          stopped.current = true;
        } else if (result.status === 'FAILED') {
          addToast('Transaction failed.', 'error');
          stopped.current = true;
        }
      }
    } catch {
      addToast('Could not fetch transaction status.', 'warning');
    }
  }, [hash, addToast, onStatusChange]);

  useEffect(() => {
    // Schedule initial poll asynchronously to avoid setState in effect
    const initialPoll = setTimeout(() => {
      poll();
    }, 0);

    const interval = setInterval(() => {
      if (!stopped.current) poll();
    }, pollIntervalMs);

    const timeout = setTimeout(() => {
      if (!stopped.current) {
        stopped.current = true;
        setTimedOut(true);
        addToast('Transaction tracking timed out.', 'warning');
      }
    }, timeoutMs);

    return () => {
      stopped.current = true;
      clearTimeout(initialPoll);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pollIntervalMs, timeoutMs, poll, addToast]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkblue p-4 shadow-glow w-full max-w-md">
      <div className="flex items-center gap-3">
        <StatusIcon status={timedOut ? 'FAILED' : status} />
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {timedOut ? 'Timed Out' : STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 break-all">
        <span className="font-mono">{hash}</span>
        <a
          href={getExplorerUrl(hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-primary hover:text-primary-light underline underline-offset-2 transition-colors"
          aria-label="View on Stellar Explorer"
        >
          ↗
        </a>
      </div>

      {ledger && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Ledger: {ledger}
        </p>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<TxStatus, string> = {
  PENDING: 'Pending…',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
};

function StatusIcon({ status }: { status: TxStatus | 'TIMED_OUT' }) {
  if (status === 'PENDING') {
    return (
      <span
        className="inline-block h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-label="Pending"
        role="status"
      />
    );
  }
  if (status === 'CONFIRMED') {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold"
        aria-label="Confirmed"
      >
        ✓
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold"
      aria-label="Failed"
    >
      ✕
    </span>
  );
}

export function TransactionTracker(props: TransactionTrackerProps) {
  // Use key prop to force remount when hash changes
  return <TransactionTrackerInner key={props.hash} {...props} />;
}

export default TransactionTracker;
