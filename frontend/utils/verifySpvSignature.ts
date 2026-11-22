export interface VerifySpvSignatureInput {
  contentHashHex: string;
  signatureHex: string;
  publicKeyHex: string;
}

function hexBytes(value: string, expectedBytes: number, field: string): Uint8Array {
  const normalized = value.trim().replace(/^0x/i, '');
  if (!new RegExp(`^[0-9a-fA-F]{${expectedBytes * 2}}$`).test(normalized)) {
    throw new Error(`${field} must be ${expectedBytes} bytes of hexadecimal data.`);
  }

  return Uint8Array.from(normalized.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

/** Verify the Oracle's Ed25519 signature over the raw 32-byte content hash. */
export async function verifySpvSignature({
  contentHashHex,
  signatureHex,
  publicKeyHex,
}: VerifySpvSignatureInput): Promise<boolean> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is not available in this browser.');
  }

  const contentHash = hexBytes(contentHashHex, 32, 'Content hash');
  const signature = hexBytes(signatureHex, 64, 'Signature');
  const publicKey = hexBytes(publicKeyHex, 32, 'Oracle public key');
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    publicKey,
    { name: 'Ed25519' },
    false,
    ['verify']
  );

  return globalThis.crypto.subtle.verify({ name: 'Ed25519' }, key, signature, contentHash);
}
