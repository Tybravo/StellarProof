import { act, renderHook } from '@testing-library/react';
import { getAddress, getNetworkDetails, isConnected, signTransaction } from '@stellar/freighter-api';
import type { Transaction } from '@stellar/stellar-sdk';
import { useSignTransaction } from '../useSignTransaction';

jest.mock('@stellar/freighter-api', () => ({
  getAddress: jest.fn(), getNetworkDetails: jest.fn(), isConnected: jest.fn(), signTransaction: jest.fn(),
}));
const tx = { source: 'wallet', networkPassphrase: 'testnet', toXDR: () => 'prepared-xdr' } as unknown as Transaction;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(isConnected).mockResolvedValue({ isConnected: true });
  jest.mocked(getAddress).mockResolvedValue({ address: 'wallet' });
  jest.mocked(getNetworkDetails).mockResolvedValue({ network: 'TESTNET', networkUrl: '', networkPassphrase: 'testnet' });
});

test('requests Freighter signing with the prepared XDR, source, and network', async () => {
  jest.mocked(signTransaction).mockResolvedValue({ signedTxXdr: 'signed-xdr', signerAddress: 'wallet' });
  const { result } = renderHook(() => useSignTransaction());
  await act(async () => { expect(await result.current.sign(tx)).toBe('signed-xdr'); });
  expect(signTransaction).toHaveBeenCalledWith('prepared-xdr', { address: 'wallet', networkPassphrase: 'testnet' });
  expect(result.current.isSigning).toBe(false);
  expect(result.current.error).toBeNull();
});

test('rejection clears loading state and permits retry', async () => {
  jest.mocked(signTransaction).mockResolvedValueOnce({ signedTxXdr: '', signerAddress: '', error: { code: -4, message: 'User declined' } });
  const { result } = renderHook(() => useSignTransaction());
  await act(async () => { await expect(result.current.sign(tx)).rejects.toThrow(/declined/); });
  expect(result.current.isSigning).toBe(false);
  expect(result.current.error).toMatch(/try again/);
  jest.mocked(signTransaction).mockResolvedValueOnce({ signedTxXdr: 'signed', signerAddress: 'wallet' });
  await act(async () => { await result.current.sign(tx); });
  expect(result.current.error).toBeNull();
});

test('network mismatch prevents a signing request', async () => {
  jest.mocked(getNetworkDetails).mockResolvedValue({ network: 'MAINNET', networkUrl: '', networkPassphrase: 'mainnet' });
  const { result } = renderHook(() => useSignTransaction());
  await act(async () => { await expect(result.current.sign(tx)).rejects.toThrow(/network/); });
  expect(signTransaction).not.toHaveBeenCalled();
});

test('disconnected wallets and source-account mismatches cannot request signing', async () => {
  jest.mocked(isConnected).mockResolvedValueOnce({ isConnected: false });
  const { result } = renderHook(() => useSignTransaction());
  await act(async () => { await expect(result.current.sign(tx)).rejects.toThrow(/Connect/); });
  jest.mocked(getAddress).mockResolvedValueOnce({ address: 'other-wallet' });
  await act(async () => { await expect(result.current.sign(tx)).rejects.toThrow(/source account/); });
  expect(signTransaction).not.toHaveBeenCalled();
  expect(result.current.isSigning).toBe(false);
});
