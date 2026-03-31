import { handleWalletError, WalletErrorType } from '../walletErrors';

describe('handleWalletError', () => {
  const mockToast = jest.fn();

  beforeEach(() => mockToast.mockClear());

  const cases: [string, unknown, WalletErrorType][] = [
    ['user rejected', 'User declined the request', WalletErrorType.USER_REJECTED],
    ['user rejected (Error)', new Error('rejected by user'), WalletErrorType.USER_REJECTED],
    ['network mismatch', 'Network mismatch detected', WalletErrorType.NETWORK_MISMATCH],
    ['extension not found', 'Extension not found', WalletErrorType.EXTENSION_NOT_FOUND],
    ['timeout', 'Request timed out', WalletErrorType.TIMEOUT],
    ['auth failed', 'Unauthorized access', WalletErrorType.AUTHORIZATION_FAILED],
    ['unknown', 'Something went wrong', WalletErrorType.UNKNOWN],
    ['unknown (null)', null, WalletErrorType.UNKNOWN],
  ];

  test.each(cases)('%s → %s', (_label, error, expected) => {
    const result = handleWalletError(error, mockToast);
    expect(result).toBe(expected);
    expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
