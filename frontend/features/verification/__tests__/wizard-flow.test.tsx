import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WizardPageShell from '../components/WizardPageShell';
import { useWizardStore } from '../store/wizard.store';

jest.mock('@/utils/hashing', () => ({
  hashFile: jest.fn().mockResolvedValue('a'.repeat(64)),
}));

jest.mock('@/utils/crypto', () => ({
  computeSHA256: jest.fn().mockResolvedValue('b'.repeat(64)),
  isValidSHA256: jest.fn((value: string) => /^[a-f0-9]{64}$/i.test(value)),
}));

jest.mock('@/context/WalletContext', () => ({
  useWallet: jest.fn(() => ({
    publicKey: null,
    isConnected: false,
    connect: jest.fn(),
  })),
}));

jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      name: 'Test Creator',
      email: 'creator@example.com',
    },
  })),
}));

jest.mock('@/components/ManifestGeneratorModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/services/manifestUseCases', () => ({
  manifestUseCaseService: {
    getAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/services/verificationService', () => ({
  submitVerificationRequest: jest.fn(),
}));

describe('Verification wizard flow', () => {
  beforeAll(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:preview');
    global.URL.revokeObjectURL = jest.fn();
  });

  beforeEach(() => {
    useWizardStore.setState({
      currentStep: 0,
      formData: {},
      validation: {},
      _hasHydrated: true,
    });
  });

  it('navigates through all four steps and carries data into the review summary', async () => {
    const user = userEvent.setup();
    const { container } = render(<WizardPageShell />);

    const mediaInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const mediaFile = new File(['image-bytes'], 'asset.png', { type: 'image/png' });
    await user.upload(mediaInput, mediaFile);

    await waitFor(() => {
      expect(screen.getByText(/sha-256 hash/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to next step/i })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: /go to next step/i }));
    expect(screen.getByRole('heading', { name: /manifest attachment/i })).toBeInTheDocument();

    const manifestInput = container.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const manifestFile = new File(['{"name":"Asset Manifest"}'], 'manifest.json', {
      type: 'application/json',
    });
    await user.upload(manifestInput, manifestFile);

    await waitFor(() => {
      expect(screen.getByText(/manifest sha-256 hash/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /go to next step/i }));
    expect(screen.getByRole('heading', { name: /spv privacy/i })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /public registry/i }));
    await user.click(screen.getByRole('button', { name: /go to next step/i }));

    expect(screen.getByRole('heading', { name: /review & submit/i })).toBeInTheDocument();
    expect(screen.getByText('asset.png')).toBeInTheDocument();
    expect(screen.getByText('manifest.json')).toBeInTheDocument();
    expect(screen.getByText(/^Public$/)).toBeInTheDocument();
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument();
    expect(screen.getByText('b'.repeat(64))).toBeInTheDocument();

    const state = useWizardStore.getState();
    expect(state.formData.content?.file?.name).toBe('asset.png');
    expect(state.formData.content?.manifest?.fileName).toBe('manifest.json');
    expect(state.formData.content?.encryptionEnabled).toBe(false);
  });
});
