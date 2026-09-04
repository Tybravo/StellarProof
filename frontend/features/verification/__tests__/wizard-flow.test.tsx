import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useWizardStore } from '../store/wizard.store';
import WizardPageShell from '../components/WizardPageShell'; // Adjust path to your main wizard component

// 1. Mock the individual steps to simplify DOM interaction in JSDOM.
// This allows us to test the FLOW and DATA PERSISTENCE without fighting file upload events.
jest.mock('../components/steps/MediaUploadStep', () => {
  return function MockMediaUpload() {
    const { setUploadFile, nextStep } = useWizardStore();
    return (
      <div data-testid="step-1">
        <button 
          onClick={() => {
            setUploadFile(new File(['dummy content'], 'test.png', { type: 'image/png' }));
            nextStep();
          }}
        >
          Simulate Upload & Next
        </button>
      </div>
    );
  };
});

jest.mock('../components/steps/UploadManifest', () => {
  return function MockUploadManifest() {
    const { setManifest, nextStep } = useWizardStore();
    return (
      <div data-testid="step-2">
        <button 
          onClick={() => {
            setManifest(
              { content: '', format: 'json', fileName: 'manifest.json', fileSize: 0 },
              '0xabcdef123456',
            );
            nextStep();
          }}
        >
          Simulate Manifest & Next
        </button>
      </div>
    );
  };
});

jest.mock('../components/steps/SPVPrivacyStep', () => {
  return function MockSPVPrivacy() {
    const { setEncryptionEnabled, nextStep } = useWizardStore();
    return (
      <div data-testid="step-3">
        <button 
          onClick={() => {
            setEncryptionEnabled(false); // Set to Public
            nextStep();
          }}
        >
          Simulate Privacy & Next
        </button>
      </div>
    );
  };
});

// For Step 4, we don't mock it, we want to see if the real Review component catches the data.
// However, we mock the Freighter API and service to prevent actual blockchain calls during tests.
jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn().mockResolvedValue(true),
  requestAccess: jest.fn().mockResolvedValue({ address: 'GDUMMYPUBLICKEY123456789' }),
}));

jest.mock('@/services/verificationService', () => ({
  submitVerificationRequest: jest.fn().mockResolvedValue({
    txHash: '0x123456789',
    requestId: 'REQ-001',
    certificateId: 'CERT-001'
  }),
}));

describe('Verification Wizard End-to-End Flow', () => {
  // 2. CRITICAL: Zustand stores persist state across tests. We must reset it before each test.
  beforeEach(() => {
    const store = useWizardStore.getState();
    store.resetWizard();
    store.setStep(0); // Ensure we always start at step 0
    jest.clearAllMocks();
  });

  it('navigates from step 1 to 4 and persists data in the store', async () => {
    const user = userEvent.setup();
    render(<WizardPageShell />);

    // --- STEP 1: Upload ---
    expect(screen.getByTestId('step-1')).toBeInTheDocument();
    await user.click(screen.getByText('Simulate Upload & Next'));

    // --- STEP 2: Manifest ---
    expect(screen.getByTestId('step-2')).toBeInTheDocument();
    await user.click(screen.getByText('Simulate Manifest & Next'));

    // --- STEP 3: Privacy ---
    expect(screen.getByTestId('step-3')).toBeInTheDocument();
    await user.click(screen.getByText('Simulate Privacy & Next'));

    // --- STEP 4: Review & Submit (Real Component rendered by the Shell) ---
    // Wait for the final step to render
    await waitFor(() => {
      expect(screen.getByText(/Review & Submit/i)).toBeInTheDocument();
    });

    // 3. Assert Data Persistence
    // Since we are rendering the real Review step, we can check if the mocked data
    // from steps 1-3 successfully carried over and rendered in the DOM.
    expect(screen.getByText('test.png')).toBeInTheDocument(); // From Step 1
    expect(screen.getByText('0xabcdef123456')).toBeInTheDocument(); // From Step 2
    expect(screen.getByText('Public Ledger')).toBeInTheDocument(); // From Step 3

    // Verify Zustand state directly as a double-check
    const currentState = useWizardStore.getState();
    expect(currentState.formData.content?.file?.name).toBe('test.png');
    expect(currentState.formData.content?.manifestHash).toBe('0xabcdef123456');
    expect(currentState.formData.content?.encryptionEnabled).toBe(false);
    expect(currentState.currentStep).toBe(3);
  });
});