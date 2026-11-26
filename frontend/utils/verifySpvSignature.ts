export interface VerifySpvSignatureInput {
  contentHashHex: string;
  signatureHex: string;
  publicKeyHex: string;
}

function decodeHex(value: string, byteLength: number, label: string): Uint8Array<ArrayBuffer> {
  const normalized = value.trim().replace(/^0x/i, '');
  if (!new RegExp(`^[0-9a-fA-F]{${byteLength * 2}}$`).test(normalized)) {
    throw new Error(`${label} must contain exactly ${byteLength} bytes of hexadecimal data.`);
  }
  return Uint8Array.from(normalized.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

export async function verifySpvSignature(input: VerifySpvSignatureInput): Promise<boolean> {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser.');
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    decodeHex(input.publicKeyHex, 32, 'Oracle public key'),
    { name: 'Ed25519' },
    false,
    ['verify']
  );
  return globalThis.crypto.subtle.verify(
    { name: 'Ed25519' },
    key,
    decodeHex(input.signatureHex, 64, 'Signature'),
    decodeHex(input.contentHashHex, 32, 'Content hash')
  );
}
