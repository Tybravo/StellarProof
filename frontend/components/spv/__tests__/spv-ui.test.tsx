import { render, screen } from '@testing-library/react';
import HashDisplay from '../HashDisplay';
import SpvResultsPanel from '../SpvResultsPanel';
import { useWizardStore } from '@/features/verification/store/wizard.store';

const CONTENT_HASH = 'ab'.repeat(32);
const MANIFEST_HASH = 'cd'.repeat(32);

describe('SPV result UI', () => {
  beforeEach(() => {
    useWizardStore.getState().resetWizard();
  });

  it('renders content and manifest hashes in code elements', () => {
    const { container } = render(
      <HashDisplay contentHashHex={CONTENT_HASH} manifestHashHex={MANIFEST_HASH} />
    );
    expect(screen.getByText(CONTENT_HASH)).toBeInTheDocument();
    expect(screen.getByText(MANIFEST_HASH)).toBeInTheDocument();
    expect(container.querySelectorAll('code')).toHaveLength(2);
  });

  it('reads persisted SPV output from the Zustand wizard store', () => {
    useWizardStore.getState().setSPVResult({
      encryptedHash: CONTENT_HASH,
      storageId: 'spv-primary-01',
      verified: true,
      contentHashHex: CONTENT_HASH,
      manifestHashHex: MANIFEST_HASH,
      signatureHex: 'ef'.repeat(64),
      providerPublicKeyHex: '12'.repeat(32),
      spvId: 'spv-primary-01',
    });

    render(<SpvResultsPanel />);
    expect(screen.getByText(CONTENT_HASH)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verify proof' })).toBeInTheDocument();
  });

  it('renders an empty state before SPV output is stored', () => {
    render(<SpvResultsPanel />);
    expect(screen.getByText(/not available yet/i)).toBeInTheDocument();
  });
});
