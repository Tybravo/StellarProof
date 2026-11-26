'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export interface VerificationErrorBoundaryProps {
  children: React.ReactNode;
  /** Called with the error and React component stack when a crash is caught. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Called when the user chooses to retry; use it to clear any corrupted state. */
  onReset?: () => void;
  /** Changing any value in this array clears a previously caught error. */
  resetKeys?: ReadonlyArray<unknown>;
}

interface State {
  error: Error | null;
}

function keysChanged(a: ReadonlyArray<unknown> = [], b: ReadonlyArray<unknown> = []) {
  return a.length !== b.length || a.some((item, i) => !Object.is(item, b[i]));
}

/**
 * Catches render/lifecycle errors in the verification pipeline and shows a
 * fallback instead of unmounting the whole page to a blank screen.
 */
export default class VerificationErrorBoundary extends React.Component<
  VerificationErrorBoundaryProps,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Verification pipeline crashed:', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: VerificationErrorBoundaryProps) {
    if (this.state.error && keysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="mx-auto w-full max-w-xl space-y-6 py-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The verification flow hit an unexpected error. Try again, or start over if the problem continues.
          </p>
          <p className="break-words font-mono text-xs text-gray-500" data-testid="boundary-error-message">
            {this.state.error.message}
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </button>
      </div>
    );
  }
}
