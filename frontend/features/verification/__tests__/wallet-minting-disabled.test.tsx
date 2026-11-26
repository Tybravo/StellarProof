/** Uses the real minting switch and the real service. */
import { fireEvent, render, screen } from '@testing-library/react';
import { isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import { MINTING_UNAVAILABLE_MESSAGE, WALLET_MINTING_ENABLED } from '@/config/minting';
import { submitVerificationRequest } from '@/services/verificationService';
import ReadyToMint from '../components/ReadyToMint';

jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn(),
  requestAccess: jest.fn(),
  signTransaction: jest.fn(),
}));
jest.mock('@/services/wallet', () => ({ walletService: { getNetworkDetails: jest.fn() } }));
jest.mock('@stellar/stellar-sdk', () => ({
  Networks: { TESTNET: 'testnet' },
  Horizon: { Server: jest.fn() },
}));

describe('wallet minting disabled', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is switched off', () => {
    expect(WALLET_MINTING_ENABLED).toBe(false);
  });

  it('explains why and never contacts the wallet from the UI', () => {
    render(<ReadyToMint contentHash={'a'.repeat(64)} manifestHash={null} isReady />);
    expect(screen.getByRole('status')).toHaveTextContent(MINTING_UNAVAILABLE_MESSAGE);
    expect(screen.getByRole('checkbox')).toBeDisabled();
    const button = screen.getByRole('button', { name: /submit record/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(isConnected).not.toHaveBeenCalled();
    expect(requestAccess).not.toHaveBeenCalled();
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it('makes the service refuse before asking for a signature', async () => {
    const onSigningChange = jest.fn();
    await expect(submitVerificationRequest('h', null, 'G', onSigningChange)).rejects.toMatchObject({
      kind: 'configuration',
      message: MINTING_UNAVAILABLE_MESSAGE,
    });
    expect(signTransaction).not.toHaveBeenCalled();
    expect(onSigningChange).not.toHaveBeenCalled();
  });
});
