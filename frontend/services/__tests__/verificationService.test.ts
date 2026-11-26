const mockSign = jest.fn();
const mockSubmit = jest.fn();

jest.mock('@stellar/freighter-api', () => ({ signTransaction: (...a: unknown[]) => mockSign(...a) }));
// Keep covering the submission pipeline while the real switch is off.
jest.mock('@/config/minting', () => ({ WALLET_MINTING_ENABLED: true, MINTING_UNAVAILABLE_MESSAGE: '' }));
jest.mock('../wallet', () => ({
  walletService: { getNetworkDetails: jest.fn().mockResolvedValue(null) },
}));

jest.mock('@stellar/stellar-sdk', () => {
  const builder = {
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ toXDR: () => 'XDR' }),
  };
  const TransactionBuilder = jest.fn().mockImplementation(() => builder) as unknown as {
    fromXDR: jest.Mock;
  };
  TransactionBuilder.fromXDR = jest.fn().mockReturnValue({});
  return {
    Networks: { TESTNET: 'Test SDF Network ; September 2015' },
    BASE_FEE: '100',
    TransactionBuilder,
    Contract: jest.fn().mockImplementation(() => ({ call: jest.fn() })),
    Address: { fromString: () => ({ toScVal: () => ({}) }) },
    xdr: { ScVal: { scvString: () => ({}) } },
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn().mockResolvedValue({}),
        submitTransaction: (...a: unknown[]) => mockSubmit(...a),
      })),
    },
  };
});

describe('submitVerificationRequest failure handling', () => {
  let submitVerificationRequest: typeof import('../verificationService').submitVerificationRequest;
  let VerificationSubmissionError: typeof import('../verificationService').VerificationSubmissionError;

  beforeEach(async () => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID = 'CTEST';
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockSign.mockReset().mockResolvedValue('SIGNED');
    mockSubmit.mockReset();
    const mod = await import('../verificationService');
    submitVerificationRequest = mod.submitVerificationRequest;
    VerificationSubmissionError = mod.VerificationSubmissionError;
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns the hash on success', async () => {
    mockSubmit.mockResolvedValue({ hash: 'abcdef1234', result_xdr: 'x' });
    await expect(submitVerificationRequest('h', null, 'G')).resolves.toMatchObject({ txHash: 'abcdef1234' });
  });

  it('signs the built transaction for the connected account and reports signing progress', async () => {
    mockSubmit.mockResolvedValue({ hash: 'abcdef1234', result_xdr: 'x' });
    const onSigningChange = jest.fn();
    await submitVerificationRequest('h', null, 'G', onSigningChange);
    expect(mockSign).toHaveBeenCalledWith('XDR', {
      address: 'G',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    expect(onSigningChange.mock.calls).toEqual([[true], [false]]);
  });

  it('ends signing progress and submits nothing when signing throws', async () => {
    mockSign.mockRejectedValue(new Error('User declined access'));
    const onSigningChange = jest.fn();
    await expect(submitVerificationRequest('h', null, 'G', onSigningChange)).rejects.toMatchObject({
      kind: 'user_rejected',
    });
    expect(onSigningChange.mock.calls).toEqual([[true], [false]]);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('classifies Horizon result codes as on-chain failures', async () => {
    mockSubmit.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), {
        response: { data: { extras: { result_codes: { transaction: 'tx_failed', operations: ['op_underfunded'] } } } },
      })
    );
    const err = await submitVerificationRequest('h', null, 'G').catch((e) => e);
    expect(err).toBeInstanceOf(VerificationSubmissionError);
    expect(err.kind).toBe('on_chain');
    expect(err.message).toContain('Insufficient balance');
    expect(err.message).toContain('op_underfunded');
  });

  it('classifies a wallet decline as user_rejected', async () => {
    mockSign.mockResolvedValue({ error: { message: 'User declined access' } });
    const err = await submitVerificationRequest('h', null, 'G').catch((e) => e);
    expect(err.kind).toBe('user_rejected');
    expect(err.message).toBe('User declined the signing request');
  });

  it('classifies connectivity problems as network errors', async () => {
    mockSubmit.mockRejectedValue(new Error('Network Error'));
    const err = await submitVerificationRequest('h', null, 'G').catch((e) => e);
    expect(err.kind).toBe('network');
  });

  it('preserves tx_bad_seq messaging', async () => {
    mockSubmit.mockRejectedValue(new Error('tx_bad_seq'));
    const err = await submitVerificationRequest('h', null, 'G').catch((e) => e);
    expect(err.message).toBe('Transaction sequence error. Please try again.');
  });

  it('falls back to a generic failure message', async () => {
    mockSubmit.mockRejectedValue(new Error('weird'));
    const err = await submitVerificationRequest('h', null, 'G').catch((e) => e);
    expect(err.kind).toBe('unknown');
    expect(err.message).toBe('Transaction failed: weird');
  });
});
