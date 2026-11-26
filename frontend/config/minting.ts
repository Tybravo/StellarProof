/**
 * Wallet minting is disabled because the current flow cannot be expected to succeed:
 * - `provenance.mint` requires authorization from the contract's stored oracle
 *   address, but the frontend asks the connected user to sign.
 * - The frontend sends a JSON string where the contract expects `CertificateDetails`.
 * - The transaction is not simulated or prepared for Soroban.
 *
 * Do not enable this until all three are resolved and verified on testnet.
 */
export const WALLET_MINTING_ENABLED: boolean = false;

export const MINTING_UNAVAILABLE_MESSAGE =
  'Minting is temporarily unavailable. Nothing will be sent to your wallet or the Stellar network.';
