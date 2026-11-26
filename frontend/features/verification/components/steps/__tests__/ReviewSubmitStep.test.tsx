import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { requestAccess } from '@stellar/freighter-api';
import ReviewSubmitStep from '../ReviewSubmitStep';
import { useWizardStore } from '../../../store/wizard.store';

jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn().mockResolvedValue({ isConnected: true }),
  requestAccess: jest.fn(),
}));
jest.mock('@/services/verificationService', () => ({ submitVerificationRequest: jest.fn() }));
jest.mock('@/components/wallet/SignPromptModal', () => ({ SignPromptModal: () => null }));

test('wallet rejection restores the wizard and allows a second attempt', async () => {
  act(() => { useWizardStore.getState().resetWizard(); useWizardStore.getState().setContentHash('ab'.repeat(32)); });
  jest.mocked(requestAccess).mockResolvedValue({ address: '', error: { code: -4, message: 'User declined' } });
  render(<ReviewSubmitStep />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Submit Record/ }));
  await screen.findByText(/You declined the Freighter/);
  expect(useWizardStore.getState().isSubmitting).toBe(false);
  expect(useWizardStore.getState().formData.content?.contentHash).toBe('ab'.repeat(32));
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  fireEvent.click(screen.getByRole('button', { name: /Submit Record/ }));
  await waitFor(() => expect(requestAccess).toHaveBeenCalledTimes(2));
});
