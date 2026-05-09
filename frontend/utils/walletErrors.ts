import { useToast } from '@/app/context/ToastContext';

export enum WalletErrorType {
  USER_REJECTED = 'USER_REJECTED',
  NETWORK_MISMATCH = 'NETWORK_MISMATCH',
  EXTENSION_NOT_FOUND = 'EXTENSION_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

const ERROR_MESSAGES: Record<WalletErrorType, string> = {
  [WalletErrorType.USER_REJECTED]: 'Connection request was rejected. Please approve it in Freighter and try again.',
  [WalletErrorType.NETWORK_MISMATCH]: 'Network mismatch detected. Switch Freighter to the correct Stellar network.',
  [WalletErrorType.EXTENSION_NOT_FOUND]: 'Freighter wallet not found. Please install the extension and refresh.',
  [WalletErrorType.TIMEOUT]: 'The request timed out. Please check your connection and try again.',
  [WalletErrorType.AUTHORIZATION_FAILED]: 'Authorization failed. Make sure Freighter has permission to connect.',
  [WalletErrorType.UNKNOWN]: 'An unexpected wallet error occurred. Please try again.',
};

function classifyError(error: unknown): WalletErrorType {
  const msg = (
    typeof error === 'string' ? error :
    error instanceof Error ? error.message :
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  ).toLowerCase();

  if (msg.includes('reject') || msg.includes('declined') || msg.includes('denied')) return WalletErrorType.USER_REJECTED;
  if (msg.includes('network') || msg.includes('mismatch')) return WalletErrorType.NETWORK_MISMATCH;
  if (msg.includes('not installed') || msg.includes('not found') || msg.includes('extension')) return WalletErrorType.EXTENSION_NOT_FOUND;
  if (msg.includes('timeout') || msg.includes('timed out')) return WalletErrorType.TIMEOUT;
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('forbidden')) return WalletErrorType.AUTHORIZATION_FAILED;
  return WalletErrorType.UNKNOWN;
}

export function handleWalletError(error: unknown, addToast: (msg: string, type: 'error') => void): WalletErrorType {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') console.error('[WalletError]', error);
  const type = classifyError(error);
  addToast(ERROR_MESSAGES[type], 'error');
  return type;
}

export function useWalletError() {
  const { addToast } = useToast();
  return (error: unknown) => handleWalletError(error, addToast);
}
