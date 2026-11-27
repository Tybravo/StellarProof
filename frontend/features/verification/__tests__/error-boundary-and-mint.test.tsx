import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VerificationErrorBoundary from '../components/VerificationErrorBoundary';
import ReadyToMint from '../components/ReadyToMint';
import { useWizardStore } from '../store/wizard.store';
import { submitVerificationRequest, VerificationSubmissionError } from '@/services/verificationService';

jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn().mockResolvedValue({ isConnected: true }),
  requestAccess: jest.fn().mockResolvedValue({ address: 'GDUMMYPUBLICKEY' }),
}));

jest.mock('@/services/verificationService', () => {
  class VerificationSubmissionError extends Error {
    kind: string;
    constructor(message: string, kind = 'unknown') {
      super(message);
      this.kind = kind;
    }
  }
  return { submitVerificationRequest: jest.fn(), VerificationSubmissionError };
});

const mockedSubmit = submitVerificationRequest as jest.Mock;

describe('VerificationErrorBoundary', () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  function Bomb({ explode }: { explode: boolean }) {
    if (explode) throw new Error('kaboom');
    return <div>healthy child</div>;
  }

  it('renders children when nothing throws', () => {
    render(
      <VerificationErrorBoundary>
        <Bomb explode={false} />
      </VerificationErrorBoundary>
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('renders a fallback instead of a blank screen and reports the error', () => {
    const onError = jest.fn();
    render(
      <VerificationErrorBoundary onError={onError}>
        <Bomb explode />
      </VerificationErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByTestId('boundary-error-message')).toHaveTextContent('kaboom');
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'kaboom' }), expect.anything());
  });

  it('recovers via Try Again after onReset fixes the cause', async () => {
    const user = userEvent.setup();
    let explode = true;
    function Wrapper() {
      return <Bomb explode={explode} />;
    }
    render(
      <VerificationErrorBoundary onReset={() => (explode = false)}>
        <Wrapper />
      </VerificationErrorBoundary>
    );
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('clears the error when resetKeys change', () => {
    const { rerender } = render(
      <VerificationErrorBoundary resetKeys={[1]}>
        <Bomb explode />
      </VerificationErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <VerificationErrorBoundary resetKeys={[2]}>
        <Bomb explode={false} />
      </VerificationErrorBoundary>
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });
});

describe('ReadyToMint', () => {
  const HASH = 'a'.repeat(64);

  beforeEach(() => {
    useWizardStore.getState().resetWizard();
    jest.clearAllMocks();
  });

  async function confirmAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /mint certificate/i }));
  }

  it('keeps the submit button disabled until confirmed', async () => {
    const user = userEvent.setup();
    render(<ReadyToMint contentHash={HASH} manifestHash={null} isReady />);
    expect(screen.getByRole('button', { name: /mint certificate/i })).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /mint certificate/i })).toBeEnabled();
  });

  it('stores the result on success', async () => {
    const user = userEvent.setup();
    mockedSubmit.mockResolvedValue({ txHash: 'tx1', requestId: 'REQ-1' });
    render(<ReadyToMint contentHash={HASH} manifestHash="mh" isReady />);
    await confirmAndSubmit(user);
    await waitFor(() => expect(useWizardStore.getState().submissionResult?.txHash).toBe('tx1'));
    expect(mockedSubmit).toHaveBeenCalledWith(HASH, 'mh', 'GDUMMYPUBLICKEY');
  });

  it('shows a categorised error UI when the transaction fails on-chain, and can retry', async () => {
    const user = userEvent.setup();
    mockedSubmit.mockRejectedValueOnce(
      new (VerificationSubmissionError as unknown as new (m: string, k: string) => Error)(
        'The transaction was rejected by the Stellar network. (tx_failed)',
        'on_chain'
      )
    );
    render(<ReadyToMint contentHash={HASH} manifestHash={null} isReady />);
    await confirmAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Transaction failed on-chain');
    expect(screen.getByTestId('mint-error-message')).toHaveTextContent('tx_failed');
    expect(useWizardStore.getState().isSubmitting).toBe(false);

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByRole('button', { name: /mint certificate/i })).toBeInTheDocument();
    expect(useWizardStore.getState().submissionError).toBeNull();
  });

  it('shows the generic failure UI for unexpected errors', async () => {
    const user = userEvent.setup();
    mockedSubmit.mockRejectedValueOnce(new Error('boom'));
    render(<ReadyToMint contentHash={HASH} manifestHash={null} isReady />);
    await confirmAndSubmit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Minting failed');
    expect(screen.getByTestId('mint-error-message')).toHaveTextContent('boom');
  });
});
