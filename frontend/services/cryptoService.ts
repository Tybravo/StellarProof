/**
 * Browser-side AES-GCM encryption and decryption service using the Web Crypto API.
 *
 * Compatible with the StellarProof backend KMS packed binary format:
 * `[IV (12 bytes) | Ciphertext | Auth Tag (16 bytes)]`.
 */

export const AES_GCM_ALGORITHM = "AES-GCM" as const;
export const AES_GCM_IV_LENGTH = 12;
export const AES_GCM_TAG_LENGTH_BITS = 128;
export const AES_GCM_TAG_LENGTH_BYTES = 16;
export const AES_256_KEY_LENGTH_BYTES = 32;
export const DEFAULT_PBKDF2_ITERATIONS = 100_000;

export type RawKeyInput = ArrayBuffer | Uint8Array | string;
export type KeyInput = CryptoKey | RawKeyInput;

export interface DecryptAesGcmParams {
  /** Ciphertext concatenated with the 16-byte GCM authentication tag. */
  ciphertext: ArrayBuffer | Uint8Array;
  /** 12-byte (96-bit) initialization vector / nonce. */
  iv: ArrayBuffer | Uint8Array;
  /** Either an imported `CryptoKey` or raw key bytes / hex / base64 string. */
  key: KeyInput;
  /** Optional Additional Authenticated Data (AAD). */
  additionalData?: ArrayBuffer | Uint8Array;
}

export interface EncryptAesGcmResult {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
}

/** Error raised when client-side AES-GCM validation or decryption fails. */
export class CryptoDecryptionError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CryptoDecryptionError";
    this.cause = cause;
  }
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new CryptoDecryptionError(
      "Web Crypto API (crypto.subtle) is not available in this environment.",
    );
  }
  return subtle;
}

function getCryptoRandomValues(): (array: Uint8Array) => Uint8Array {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
    throw new CryptoDecryptionError(
      "Web Crypto random generator (crypto.getRandomValues) is not available.",
    );
  }
  return (array: Uint8Array) => cryptoObj.getRandomValues(array);
}

/**
 * Normalizes an `ArrayBuffer` or `Uint8Array` into a standalone `ArrayBuffer`
 * so `crypto.subtle` receives a concrete `ArrayBuffer` `BufferSource`.
 */
function toArrayBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (input instanceof ArrayBuffer) {
    return input.slice(0);
  }
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
}

function toUint8Array(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  return new Uint8Array(input);
}

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64.trim();
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new CryptoDecryptionError("Base64 decoding is unavailable.");
}

function parseRawKeyString(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new CryptoDecryptionError("Decryption key cannot be empty.");
  }

  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0 && (hex.length === 32 || hex.length === 64)) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  try {
    return decodeBase64(trimmed);
  } catch (err) {
    throw new CryptoDecryptionError(
      "Invalid key format. Expected raw bytes, 128/256-bit hex, or base64.",
      err,
    );
  }
}

function isCryptoKey(value: KeyInput): value is CryptoKey {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof ArrayBuffer) &&
    !(value instanceof Uint8Array) &&
    "algorithm" in value &&
    "type" in value
  );
}

function normalizeRawKeyBytes(rawKey: RawKeyInput): ArrayBuffer {
  const bytes =
    typeof rawKey === "string"
      ? parseRawKeyString(rawKey)
      : toUint8Array(rawKey);

  if (bytes.byteLength !== 16 && bytes.byteLength !== AES_256_KEY_LENGTH_BYTES) {
    throw new CryptoDecryptionError(
      `Invalid AES-GCM key length: expected 16 or 32 bytes, got ${bytes.byteLength}.`,
    );
  }

  return toArrayBuffer(bytes);
}

async function resolveCryptoKey(
  key: KeyInput,
  usage: KeyUsage,
): Promise<CryptoKey> {
  if (isCryptoKey(key)) {
    return key;
  }
  return importAesGcmKey(key, [usage]);
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new CryptoDecryptionError("Failed to read encrypted blob."));
      }
    };
    reader.onerror = () => {
      reject(
        new CryptoDecryptionError(
          "Failed to read encrypted blob.",
          reader.error,
        ),
      );
    };
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Imports a raw 128-bit or 256-bit key (bytes, hex, or base64) into a Web Crypto `CryptoKey`.
 */
export async function importAesGcmKey(
  rawKey: RawKeyInput,
  usages: KeyUsage[] = ["decrypt"],
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const keyBuffer = normalizeRawKeyBytes(rawKey);

  try {
    return await subtle.importKey(
      "raw",
      keyBuffer,
      { name: AES_GCM_ALGORITHM },
      false,
      usages,
    );
  } catch (err) {
    throw new CryptoDecryptionError("Failed to import AES-GCM key.", err);
  }
}

/**
 * Derives a 256-bit AES-GCM `CryptoKey` from a UTF-8 passphrase and salt using PBKDF2-SHA256.
 */
export async function deriveAesGcmKeyFromPassphrase(
  passphrase: string,
  salt: ArrayBuffer | Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (!passphrase) {
    throw new CryptoDecryptionError("Decryption passphrase cannot be empty.");
  }
  const saltBytes = toUint8Array(salt);
  if (saltBytes.byteLength === 0) {
    throw new CryptoDecryptionError("Key derivation salt cannot be empty.");
  }
  if (!Number.isFinite(iterations) || iterations < 1) {
    throw new CryptoDecryptionError("PBKDF2 iteration count must be positive.");
  }

  const subtle = getSubtleCrypto();
  const passphraseBytes = new TextEncoder().encode(passphrase);

  try {
    const baseKey = await subtle.importKey(
      "raw",
      toArrayBuffer(passphraseBytes),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return await subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: toArrayBuffer(saltBytes),
        iterations,
        hash: "SHA-256",
      },
      baseKey,
      { name: AES_GCM_ALGORITHM, length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  } catch (err) {
    throw new CryptoDecryptionError(
      "Failed to derive AES-GCM key from passphrase.",
      err,
    );
  }
}

/**
 * Encrypts plaintext bytes using AES-GCM with a random 96-bit IV (useful for
 * client-side encryption flows and round-trip verification).
 */
export async function encryptAesGcm(
  plaintext: ArrayBuffer | Uint8Array,
  key: KeyInput,
  additionalData?: ArrayBuffer | Uint8Array,
  providedIv?: ArrayBuffer | Uint8Array,
): Promise<EncryptAesGcmResult> {
  const subtle = getSubtleCrypto();
  const ivBytes = providedIv
    ? toUint8Array(providedIv)
    : getCryptoRandomValues()(new Uint8Array(AES_GCM_IV_LENGTH));

  if (ivBytes.byteLength !== AES_GCM_IV_LENGTH) {
    throw new CryptoDecryptionError(
      `Invalid AES-GCM IV length: expected ${AES_GCM_IV_LENGTH} bytes, got ${ivBytes.byteLength}.`,
    );
  }

  const cryptoKey = await resolveCryptoKey(key, "encrypt");
  const algorithm: AesGcmParams = {
    name: AES_GCM_ALGORITHM,
    iv: toArrayBuffer(ivBytes),
    tagLength: AES_GCM_TAG_LENGTH_BITS,
    ...(additionalData ? { additionalData: toArrayBuffer(additionalData) } : {}),
  };

  try {
    const ciphertext = await subtle.encrypt(
      algorithm,
      cryptoKey,
      toArrayBuffer(plaintext),
    );
    return { ciphertext, iv: ivBytes };
  } catch (err) {
    throw new CryptoDecryptionError("AES-GCM encryption failed.", err);
  }
}

/**
 * Decrypts an AES-GCM ciphertext buffer (which includes the trailing 16-byte auth tag).
 */
export async function decryptAesGcm({
  ciphertext,
  iv,
  key,
  additionalData,
}: DecryptAesGcmParams): Promise<ArrayBuffer> {
  const ivBytes = toUint8Array(iv);
  if (ivBytes.byteLength !== AES_GCM_IV_LENGTH) {
    throw new CryptoDecryptionError(
      `Invalid AES-GCM IV length: expected ${AES_GCM_IV_LENGTH} bytes, got ${ivBytes.byteLength}.`,
    );
  }

  const cipherBytes = toUint8Array(ciphertext);
  if (cipherBytes.byteLength < AES_GCM_TAG_LENGTH_BYTES) {
    throw new CryptoDecryptionError(
      `Encrypted ciphertext is too short: expected at least ${AES_GCM_TAG_LENGTH_BYTES} bytes for authentication tag.`,
    );
  }

  const subtle = getSubtleCrypto();
  const cryptoKey = await resolveCryptoKey(key, "decrypt");
  const algorithm: AesGcmParams = {
    name: AES_GCM_ALGORITHM,
    iv: toArrayBuffer(ivBytes),
    tagLength: AES_GCM_TAG_LENGTH_BITS,
    ...(additionalData ? { additionalData: toArrayBuffer(additionalData) } : {}),
  };

  try {
    return await subtle.decrypt(
      algorithm,
      cryptoKey,
      toArrayBuffer(cipherBytes),
    );
  } catch (err) {
    throw new CryptoDecryptionError(
      "AES-GCM decryption failed: invalid key, corrupted ciphertext, or authentication tag mismatch.",
      err,
    );
  }
}

/**
 * Decrypts a packed binary payload formatted as `[IV (12 bytes) | Ciphertext | Auth Tag (16 bytes)]`.
 */
export async function decryptPackedBlob(
  packedBlob: ArrayBuffer | Uint8Array,
  key: KeyInput,
  additionalData?: ArrayBuffer | Uint8Array,
): Promise<ArrayBuffer> {
  const bytes = toUint8Array(packedBlob);
  const minLength = AES_GCM_IV_LENGTH + AES_GCM_TAG_LENGTH_BYTES;

  if (bytes.byteLength < minLength) {
    throw new CryptoDecryptionError(
      `Encrypted payload is too short: expected at least ${minLength} bytes, got ${bytes.byteLength}.`,
    );
  }

  const iv = bytes.subarray(0, AES_GCM_IV_LENGTH);
  const ciphertext = bytes.subarray(AES_GCM_IV_LENGTH);

  return decryptAesGcm({ ciphertext, iv, key, additionalData });
}

/**
 * Decrypts a `Blob` containing a packed `[IV (12B) | Ciphertext | Auth Tag (16B)]` payload.
 */
export async function decryptBlob(
  blob: Blob,
  key: KeyInput,
  additionalData?: ArrayBuffer | Uint8Array,
): Promise<ArrayBuffer> {
  const buffer = await readBlobAsArrayBuffer(blob);
  return decryptPackedBlob(buffer, key, additionalData);
}

/**
 * Decrypts a packed encrypted payload or `Blob` and decodes the plaintext as UTF-8 text.
 */
export async function decryptBlobToText(
  payload: Blob | ArrayBuffer | Uint8Array,
  key: KeyInput,
  additionalData?: ArrayBuffer | Uint8Array,
): Promise<string> {
  const plaintext =
    payload instanceof Blob
      ? await decryptBlob(payload, key, additionalData)
      : await decryptPackedBlob(payload, key, additionalData);
  return new TextDecoder().decode(plaintext);
}
