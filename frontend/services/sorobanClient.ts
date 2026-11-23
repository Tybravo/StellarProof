import * as StellarSDK from '@stellar/stellar-sdk';

// Configuration from environment
// NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID is the provenance contract address
export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID || '';
// Network passphrase from env, falling back to the JS SDK's known testnet passphrase.
// The frontend always needs a public variable because it runs in the browser.
export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE ||
  StellarSDK.Networks.TESTNET;

/**
 * Creates a new Stellar SDK Contract instance bound to the configured contract ID
 * and the correct network passphrase.
 *
 * Callers should use this factory so every call site uses the same network
 * configuration and avoids mismatched network errors.
 */
export function createContract(): StellarSDK.Contract {
  if (!CONTRACT_ID) {
    throw new Error(
      'Soroban contract ID not configured. Please set NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID.',
    );
  }

  return new StellarSDK.Contract(CONTRACT_ID, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
}