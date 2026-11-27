import { act, renderHook } from '@testing-library/react';
import { useWizardStore } from '../store/wizard.store';
import { useMintState } from '../hooks/useMintState';

const CERT = {
  certificateId: 'cert-123',
  txHash: 'abc123',
  mintedAt: '2026-11-22T10:00:00Z',
};

function seedWizard() {
  useWizardStore.setState({
    currentStep: 3,
    formData: { identity: { issuerAddress: 'GABC' } },
    validation: { 0: true, 1: true },
    isSubmitting: true,
    submissionResult: {
      txHash: 'tx',
      requestId: 'req',
      timestamp: '2026-11-22T09:00:00Z',
    },
    submissionError: null,
    applicationStatus: 'Draft',
    mintedCertificate: null,
    mintError: null,
  });
}

describe('wizard store minting state', () => {
  beforeEach(seedWizard);

  it('startMint sets Minting and clears a previous error', () => {
    useWizardStore.setState({ mintError: 'old' });
    useWizardStore.getState().startMint();
    const s = useWizardStore.getState();
    expect(s.applicationStatus).toBe('Minting');
    expect(s.mintError).toBeNull();
  });

  it('completeMint clears wizard data and moves to Minted', () => {
    useWizardStore.getState().completeMint(CERT);
    const s = useWizardStore.getState();
    expect(s.applicationStatus).toBe('Minted');
    expect(s.mintedCertificate).toEqual(CERT);
    expect(s.currentStep).toBe(0);
    expect(s.formData).toEqual({});
    expect(s.validation).toEqual({});
    expect(s.isSubmitting).toBe(false);
    expect(s.submissionResult).toBeNull();
    expect(s.submissionError).toBeNull();
    expect(s.mintError).toBeNull();
  });

  it('failMint keeps wizard data and records the error', () => {
    useWizardStore.getState().startMint();
    useWizardStore.getState().failMint('rejected');
    const s = useWizardStore.getState();
    expect(s.applicationStatus).toBe('Draft');
    expect(s.mintError).toBe('rejected');
    expect(s.formData).toEqual({ identity: { issuerAddress: 'GABC' } });
    expect(s.currentStep).toBe(3);
  });

  it('resetWizard returns a minted application to Draft', () => {
    useWizardStore.getState().completeMint(CERT);
    useWizardStore.getState().resetWizard();
    const s = useWizardStore.getState();
    expect(s.applicationStatus).toBe('Draft');
    expect(s.mintedCertificate).toBeNull();
  });
});

describe('useMintState', () => {
  beforeEach(seedWizard);

  it('runs a successful mint through Minting to Minted', async () => {
    const { result } = renderHook(() => useMintState());
    let resolve!: (c: typeof CERT) => void;
    const pending = new Promise<typeof CERT>((r) => (resolve = r));

    let run!: Promise<unknown>;
    act(() => {
      run = result.current.runMint(() => pending);
    });
    expect(result.current.isMinting).toBe(true);

    await act(async () => {
      resolve(CERT);
      await run;
    });
    expect(result.current.isMinted).toBe(true);
    expect(result.current.mintedCertificate).toEqual(CERT);
    expect(useWizardStore.getState().formData).toEqual({});
  });

  it('reports a failed mint and keeps the wizard data for retry', async () => {
    const { result } = renderHook(() => useMintState());
    let out: unknown;
    await act(async () => {
      out = await result.current.runMint(() => Promise.reject(new Error('User declined')));
    });
    expect(out).toBeNull();
    expect(result.current.mintError).toBe('User declined');
    expect(result.current.isMinting).toBe(false);
    expect(result.current.isMinted).toBe(false);
    expect(useWizardStore.getState().formData).toEqual({ identity: { issuerAddress: 'GABC' } });
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    const { result } = renderHook(() => useMintState());
    await act(async () => {
      await result.current.runMint(() => Promise.reject('nope'));
    });
    expect(result.current.mintError).toBe('Minting failed. Please try again.');
  });
});
