import { act, renderHook } from '@testing-library/react';
import { signTransaction } from '@stellar/freighter-api';
import { transactionErrorMessage, useSignTransaction } from '../useSignTransaction';

jest.mock('@stellar/freighter-api', () => ({ signTransaction: jest.fn() }));
const signMock = jest.mocked(signTransaction);
const options = { address: 'public-key', networkPassphrase: 'testnet' };

test.each(['tx_insufficient_fee', 'tx_insufficient_balance'])('explains %s from a Horizon error', (code) => {
  expect(transactionErrorMessage({ response: { data: { extras: { result_codes: { transaction: code } } } } }))
    .toMatch(/Insufficient XLM/);
});

test('wallet rejection clears signing state and permits retry', async () => {
  signMock.mockResolvedValueOnce({ signedTxXdr: '', signerAddress: '', error: { code: -4, message: 'User declined' } });
  const { result } = renderHook(() => useSignTransaction());
  await act(async () => { await expect(result.current.sign('xdr', options)).rejects.toThrow(/declined/); });
  expect(result.current.isSigning).toBe(false);
  expect(result.current.error).toMatch(/Try again/);
  signMock.mockResolvedValueOnce({ signedTxXdr: 'signed', signerAddress: 'public-key' });
  await act(async () => { expect(await result.current.sign('xdr', options)).toBe('signed'); });
  expect(result.current.error).toBeNull();
  expect(result.current.isSigning).toBe(false);
});

test('thrown rejection objects receive an actionable message', () => {
  expect(transactionErrorMessage({ code: 4001 })).toMatch(/declined/);
  expect(transactionErrorMessage('insufficient funds')).toMatch(/Insufficient XLM/);
});
