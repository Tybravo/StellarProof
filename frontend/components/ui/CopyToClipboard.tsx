'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, AlertCircle } from 'lucide-react';

export interface CopyToClipboardProps {
  /** The exact string written to the clipboard. */
  value: string;
  /** Human readable name of the value, used for accessible labels (e.g. "transaction hash"). */
  label?: string;
  className?: string;
  /** How long the success/failure feedback stays visible, in milliseconds. */
  feedbackDurationMs?: number;
}

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Writes text using the async Clipboard API, falling back to a hidden
 * textarea + execCommand for insecure contexts and older browsers.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  if (typeof document === 'undefined') return false;

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function CopyToClipboard({
  value,
  label = 'value',
  className = '',
  feedbackDurationMs = 2000,
}: CopyToClipboardProps) {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    const ok = await copyTextToClipboard(value);
    setState(ok ? 'copied' : 'failed');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState('idle'), feedbackDurationMs);
  }, [value, feedbackDurationMs]);

  const statusText =
    state === 'copied' ? `Copied ${label}` : state === 'failed' ? `Could not copy ${label}` : '';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!value}
        aria-label={`Copy ${label}`}
        title={`Copy ${label}`}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700 ${className}`}
      >
        {state === 'copied' ? (
          <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
        ) : state === 'failed' ? (
          <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {statusText}
      </span>
    </>
  );
}
