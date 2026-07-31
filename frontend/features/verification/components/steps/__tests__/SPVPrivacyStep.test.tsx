import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SPVPrivacyStep from '../SPVPrivacyStep';
import { useWizardStore } from '../../../store/wizard.store';

jest.mock('../../../store/wizard.store', () => ({
  useWizardStore: jest.fn(),
}));

type MockWizardState = {
  formData: {
    content: {
      encryptionEnabled: boolean;
    };
  };
  setEncryptionEnabled: jest.Mock;
  setStepValid: jest.Mock;
};

describe('SPVPrivacyStep', () => {
  const mockUseWizardStore = useWizardStore as unknown as jest.Mock;
  let mockState: MockWizardState;

  beforeEach(() => {
    mockState = {
      formData: {
        content: {
          encryptionEnabled: true,
        },
      },
      setEncryptionEnabled: jest.fn((enabled: boolean) => {
        mockState.formData.content.encryptionEnabled = enabled;
      }),
      setStepValid: jest.fn(),
    };

    mockUseWizardStore.mockImplementation((selector?: (state: MockWizardState) => unknown) =>
      selector ? selector(mockState) : mockState,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with KMS Encrypted selected and marks the step valid', () => {
    render(<SPVPrivacyStep />);

    expect(screen.getByRole('radio', { name: /public registry/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /kms encrypted/i })).toHaveAttribute('aria-checked', 'true');
    expect(mockState.setStepValid).toHaveBeenCalledWith(2, true);
  });

  it('updates the mocked store when a user selects the public option', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SPVPrivacyStep />);

    await user.click(screen.getByRole('radio', { name: /public registry/i }));
    rerender(<SPVPrivacyStep />);

    expect(mockState.setEncryptionEnabled).toHaveBeenCalledWith(false);
    expect(screen.getByRole('radio', { name: /public registry/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/plaintext storage warning/i)).toBeInTheDocument();
  });

  it('shows interactive tooltip explanations for both privacy options', async () => {
    const user = userEvent.setup();
    render(<SPVPrivacyStep />);

    await user.hover(screen.getByRole('button', { name: /explain public registry privacy option/i }));
    expect(
      await screen.findByText(/public keeps the provenance record readable on-chain/i),
    ).toBeInTheDocument();

    await user.unhover(screen.getByRole('button', { name: /explain public registry privacy option/i }));
    await user.hover(screen.getByRole('button', { name: /explain kms encrypted privacy option/i }));
    expect(
      await screen.findByText(/kms encrypted seals the provenance payload before submission/i),
    ).toBeInTheDocument();
  });
});
