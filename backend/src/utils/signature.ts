import { Keypair } from '@stellar/stellar-sdk';
import crypto from 'crypto';
import logger from './logger';

/**
 * Signature utility for ED25519 operations using Stellar-compatible keys.
 * Used by SPV mock, attestation, and webhook HMAC downstream.
 * All signatures are hex-encoded for consistency and easy transmission.
 */

/**
 * Represents a signature result with hex-encoded signature and public key.
 */
export interface SignatureResult {
  signature: string; // hex-encoded
  publicKey: string; // Stellar public key
}

/**
 * Represents a verification result.
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Signs a payload using an ED25519 secret key (Stellar Keypair).
 *
 * @param secretKey - The Stellar secret key (starting with 'S')
 * @param payload - The data to sign (can be string or Buffer)
 * @returns SignatureResult with hex-encoded signature and public key
 * @throws Error if the secret key is invalid or signing fails
 *
 * @example
 * const result = signPayload('SBXYZ...', 'my-data');
 * console.log(result.signature); // hex-encoded signature
 */
export function signPayload(secretKey: string, payload: string | Buffer): SignatureResult {
  try {
    // Validate and create keypair from secret key
    const keypair = Keypair.fromSecret(secretKey);

    // Convert payload to Buffer if it's a string
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;

    // Sign the payload using the keypair (ED25519 signature)
    const signatureBuffer = keypair.sign(payloadBuffer);

    // Convert signature to hex for transport/storage
    const signatureHex = signatureBuffer.toString('hex');

    return {
      signature: signatureHex,
      publicKey: keypair.publicKey(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[signPayload] Failed to sign payload', { error: message });
    throw new Error(`Failed to sign payload: ${message}`);
  }
}

/**
 * Verifies a signature using a public key.
 *
 * @param publicKey - The Stellar public key to verify against
 * @param payload - The original data that was signed
 * @param signature - The hex-encoded signature to verify
 * @returns VerificationResult with validity status
 *
 * @example
 * const result = verifySignature('GBXYZ...', 'my-data', 'abcd1234...');
 * if (result.valid) {
 *   console.log('Signature is valid');
 * }
 */
export function verifySignature(
  publicKey: string,
  payload: string | Buffer,
  signature: string,
): VerificationResult {
  try {
    // Validate public key format
    try {
      Keypair.fromPublicKey(publicKey);
    } catch {
      return {
        valid: false,
        error: 'Invalid public key format',
      };
    }

    // Convert payload to Buffer if it's a string
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;

    // Convert hex signature back to Buffer
    let signatureBuffer: Buffer;
    try {
      signatureBuffer = Buffer.from(signature, 'hex');
    } catch {
      return {
        valid: false,
        error: 'Invalid signature format (expected hex)',
      };
    }

    // ED25519 signatures should be exactly 64 bytes
    if (signatureBuffer.length !== 64) {
      return {
        valid: false,
        error: `Invalid signature length: expected 64 bytes, got ${signatureBuffer.length}`,
      };
    }

    // Verify the signature
    // The verify method returns true/false based on ED25519 verification
    const keypair = Keypair.fromPublicKey(publicKey);
    const isValid = keypair.verify(payloadBuffer, signatureBuffer);

    return {
      valid: isValid,
      error: isValid ? undefined : 'Signature verification failed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[verifySignature] Verification error', { error: message });
    return {
      valid: false,
      error: `Verification error: ${message}`,
    };
  }
}

/**
 * Generates an ED25519 keypair (creates a new Stellar keypair).
 * Useful for generating SPV test keys or attestation signing keys.
 *
 * @returns Object with publicKey and secret
 *
 * @example
 * const { publicKey, secret } = generateKeypair();
 * console.log(publicKey); // GBXYZ...
 * console.log(secret);    // SBXYZ...
 */
export function generateKeypair(): {
  publicKey: string;
  secret: string;
} {
  try {
    const keypair = Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secret: keypair.secret(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[generateKeypair] Failed to generate keypair', { error: message });
    throw new Error(`Failed to generate keypair: ${message}`);
  }
}

/**
 * Computes an HMAC-SHA256 hash for webhook payload verification.
 * Used for downstream webhook HMAC signature generation and verification.
 *
 * @param payload - The webhook payload (string or Buffer)
 * @param secret - The HMAC secret key
 * @returns hex-encoded HMAC
 *
 * @example
 * const hmac = computeHMAC('webhook-payload', 'my-secret');
 * console.log(hmac); // hex-encoded HMAC
 */
export function computeHMAC(payload: string | Buffer, secret: string): string {
  try {
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
    const secretBuffer = Buffer.from(secret, 'utf8');

    const hmac = crypto.createHmac('sha256', secretBuffer);
    hmac.update(payloadBuffer);

    return hmac.digest('hex');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[computeHMAC] Failed to compute HMAC', { error: message });
    throw new Error(`Failed to compute HMAC: ${message}`);
  }
}

/**
 * Verifies an HMAC-SHA256 signature for webhook payloads.
 *
 * @param payload - The webhook payload
 * @param secret - The HMAC secret key
 * @param expectedHMAC - The HMAC to verify against (hex-encoded)
 * @returns VerificationResult with validity status
 *
 * @example
 * const result = verifyHMAC('webhook-payload', 'my-secret', 'abc123...');
 * if (result.valid) {
 *   console.log('Webhook signature is valid');
 * }
 */
export function verifyHMAC(
  payload: string | Buffer,
  secret: string,
  expectedHMAC: string,
): VerificationResult {
  try {
    const computedHMAC = computeHMAC(payload, secret);

    // Use timing-safe comparison to prevent timing attacks
    const computedBuffer = Buffer.from(computedHMAC, 'hex');
    const expectedBuffer = Buffer.from(expectedHMAC, 'hex');

    if (computedBuffer.length !== expectedBuffer.length) {
      return {
        valid: false,
        error: 'HMAC length mismatch',
      };
    }

    const isValid = crypto.timingSafeEqual(computedBuffer, expectedBuffer);

    return {
      valid: isValid,
      error: isValid ? undefined : 'HMAC verification failed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('[verifyHMAC] Verification error', { error: message });
    return {
      valid: false,
      error: `Verification error: ${message}`,
    };
  }
}
