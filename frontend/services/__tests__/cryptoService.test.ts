/**
 * Unit tests for browser-side AES-GCM decryption logic in `cryptoService`.
 *
 * Uses a Web Crypto API mock backed by Node's native `crypto` AES-256-GCM
 * implementation so that both Web Crypto API interactions and real AES-GCM
 * decryption math (96-bit IV, 128-bit auth tag, AAD, PBKDF2 key derivation)
 * are verified deterministically in Jest/jsdom.
 */

import * as nodeCrypto from "crypto";
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util";
import {
  AES_GCM_IV_LENGTH,
  AES_GCM_TAG_LENGTH_BYTES,
  CryptoDecryptionError,
  decryptAesGcm,
  decryptBlob,
  decryptBlobToText,
  decryptPackedBlob,
  deriveAesGcmKeyFromPassphrase,
  encryptAesGcm,
  importAesGcmKey,
} from "../cryptoService";

if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = NodeTextEncoder as unknown as typeof TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = NodeTextDecoder as unknown as typeof TextDecoder;
}

interface MockCryptoKey extends CryptoKey {
  _rawKeyBytes: Buffer;
}

function toNodeBuffer(data: BufferSource): Buffer {
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

function makeMockCryptoKey(
  rawBytes: Buffer,
  algorithm: KeyAlgorithm,
  usages: KeyUsage[],
): MockCryptoKey {
  return {
    type: "secret",
    extractable: false,
    algorithm,
    usages,
    _rawKeyBytes: rawBytes,
  };
}

function createWebCryptoMock() {
  const importKey = jest.fn(
    async (
      format: KeyFormat,
      keyData: BufferSource,
      algorithm: AlgorithmIdentifier | KeyAlgorithm,
      _extractable: boolean,
      keyUsages: KeyUsage[],
    ): Promise<CryptoKey> => {
      if (format !== "raw") {
        throw new Error(`Unsupported format: ${format}`);
      }
      const bytes = toNodeBuffer(keyData);
      const algName =
        typeof algorithm === "string" ? algorithm : algorithm.name;
      return makeMockCryptoKey(bytes, { name: algName }, keyUsages);
    },
  );

  const deriveKey = jest.fn(
    async (
      algorithm: Pbkdf2Params,
      baseKey: CryptoKey,
      derivedKeyType: AesKeyGenParams,
      _extractable: boolean,
      keyUsages: KeyUsage[],
    ): Promise<CryptoKey> => {
      const mockBase = baseKey as MockCryptoKey;
      const salt = toNodeBuffer(algorithm.salt);
      const keyLengthBytes = derivedKeyType.length / 8;
      const derived = nodeCrypto.pbkdf2Sync(
        mockBase._rawKeyBytes,
        salt,
        algorithm.iterations,
        keyLengthBytes,
        "sha256",
      );
      return makeMockCryptoKey(
        derived,
        { name: derivedKeyType.name },
        keyUsages,
      );
    },
  );

  const encrypt = jest.fn(
    async (
      algorithm: AesGcmParams,
      key: CryptoKey,
      data: BufferSource,
    ): Promise<ArrayBuffer> => {
      const mockKey = key as MockCryptoKey;
      const iv = toNodeBuffer(algorithm.iv);
      const plaintext = toNodeBuffer(data);
      const cipherAlg =
        mockKey._rawKeyBytes.length === 16 ? "aes-128-gcm" : "aes-256-gcm";

      const cipher = nodeCrypto.createCipheriv(cipherAlg, mockKey._rawKeyBytes, iv);
      if (algorithm.additionalData) {
        cipher.setAAD(toNodeBuffer(algorithm.additionalData));
      }
      const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const combined = Buffer.concat([encrypted, authTag]);
      return combined.buffer.slice(
        combined.byteOffset,
        combined.byteOffset + combined.byteLength,
      );
    },
  );

  const decrypt = jest.fn(
    async (
      algorithm: AesGcmParams,
      key: CryptoKey,
      data: BufferSource,
    ): Promise<ArrayBuffer> => {
      const mockKey = key as MockCryptoKey;
      const iv = toNodeBuffer(algorithm.iv);
      const packed = toNodeBuffer(data);
      const tagBytes = (algorithm.tagLength ?? 128) / 8;

      const ciphertext = packed.subarray(0, packed.length - tagBytes);
      const authTag = packed.subarray(packed.length - tagBytes);
      const cipherAlg =
        mockKey._rawKeyBytes.length === 16 ? "aes-128-gcm" : "aes-256-gcm";

      const decipher = nodeCrypto.createDecipheriv(
        cipherAlg,
        mockKey._rawKeyBytes,
        iv,
      );
      if (algorithm.additionalData) {
        decipher.setAAD(toNodeBuffer(algorithm.additionalData));
      }
      decipher.setAuthTag(authTag);

      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plaintext.buffer.slice(
        plaintext.byteOffset,
        plaintext.byteOffset + plaintext.byteLength,
      );
    },
  );

  const getRandomValues = jest.fn((array: Uint8Array) => {
    const bytes = nodeCrypto.randomBytes(array.byteLength);
    array.set(bytes);
    return array;
  });

  return {
    subtle: {
      importKey,
      deriveKey,
      encrypt,
      decrypt,
    },
    getRandomValues,
  };
}

function packAesGcmPayload(
  plaintext: string,
  keyBytes: Uint8Array,
  ivBytes: Uint8Array,
  aad?: Uint8Array,
): {
  iv: Uint8Array;
  ciphertextWithTag: Uint8Array;
  packedBlob: Uint8Array;
} {
  const cipherAlg = keyBytes.length === 16 ? "aes-128-gcm" : "aes-256-gcm";
  const cipher = nodeCrypto.createCipheriv(cipherAlg, keyBytes, ivBytes);
  if (aad) {
    cipher.setAAD(aad);
  }
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const ciphertextWithTag = new Uint8Array(Buffer.concat([encrypted, authTag]));
  const packedBlob = new Uint8Array(
    Buffer.concat([Buffer.from(ivBytes), encrypted, authTag]),
  );
  return { iv: ivBytes, ciphertextWithTag, packedBlob };
}

describe("cryptoService (AES-GCM decryption)", () => {
  const originalCrypto = globalThis.crypto;
  let webCryptoMock: ReturnType<typeof createWebCryptoMock>;

  beforeEach(() => {
    webCryptoMock = createWebCryptoMock();
    Object.defineProperty(globalThis, "crypto", {
      value: webCryptoMock,
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "crypto", {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  it("decrypts an AES-256-GCM ciphertext buffer using a mock 32-byte key", async () => {
    const keyBytes = new Uint8Array(nodeCrypto.randomBytes(32));
    const ivBytes = new Uint8Array(nodeCrypto.randomBytes(AES_GCM_IV_LENGTH));
    const secretMessage = "StellarProof SPV provenance payload #1234";

    const { iv, ciphertextWithTag } = packAesGcmPayload(
      secretMessage,
      keyBytes,
      ivBytes,
    );

    const decryptedBuffer = await decryptAesGcm({
      ciphertext: ciphertextWithTag,
      iv,
      key: keyBytes,
    });

    expect(new TextDecoder().decode(decryptedBuffer)).toBe(secretMessage);
    expect(webCryptoMock.subtle.importKey).toHaveBeenCalledWith(
      "raw",
      expect.any(ArrayBuffer),
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
    expect(webCryptoMock.subtle.decrypt).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "AES-GCM",
        tagLength: 128,
        iv: expect.any(ArrayBuffer),
      }),
      expect.objectContaining({ type: "secret" }),
      expect.any(ArrayBuffer),
    );
  });

  it("supports hex, base64, and pre-imported CryptoKey inputs", async () => {
    const keyBytes = new Uint8Array(nodeCrypto.randomBytes(32));
    const ivBytes = new Uint8Array(nodeCrypto.randomBytes(AES_GCM_IV_LENGTH));
    const message = "Verified manifest metadata JSON";
    const { packedBlob } = packAesGcmPayload(message, keyBytes, ivBytes);

    const hexKey = Buffer.from(keyBytes).toString("hex");
    const base64Key = Buffer.from(keyBytes).toString("base64");
    const importedKey = await importAesGcmKey(keyBytes);

    expect(await decryptBlobToText(packedBlob, `0x${hexKey}`)).toBe(message);
    expect(await decryptBlobToText(packedBlob, base64Key)).toBe(message);
    expect(await decryptBlobToText(packedBlob, importedKey)).toBe(message);
  });

  it("decrypts KMS-style packed blobs [IV (12B) | ciphertext | authTag (16B)] and Blob objects", async () => {
    const keyBytes = new Uint8Array(nodeCrypto.randomBytes(32));
    const ivBytes = new Uint8Array(nodeCrypto.randomBytes(AES_GCM_IV_LENGTH));
    const message = "Binary asset content inside SPV vault";
    const { packedBlob } = packAesGcmPayload(message, keyBytes, ivBytes);

    const decryptedBytes = await decryptPackedBlob(packedBlob.buffer, keyBytes);
    expect(new TextDecoder().decode(decryptedBytes)).toBe(message);

    const blob = new Blob([packedBlob], { type: "application/octet-stream" });
    const decryptedFromBlob = await decryptBlob(blob, keyBytes);
    expect(new TextDecoder().decode(decryptedFromBlob)).toBe(message);
  });

  it("derives an AES-256-GCM key from a passphrase and decrypts round-trip data", async () => {
    const salt = new Uint8Array(nodeCrypto.randomBytes(16));
    const derivedKey = await deriveAesGcmKeyFromPassphrase(
      "correct-horse-battery-staple",
      salt,
      10_000,
    );

    const plaintext = new TextEncoder().encode("Confidential SPV proof");
    const { ciphertext, iv } = await encryptAesGcm(plaintext, derivedKey);
    const decrypted = await decryptAesGcm({
      ciphertext,
      iv,
      key: derivedKey,
    });

    expect(new TextDecoder().decode(decrypted)).toBe("Confidential SPV proof");
    expect(webCryptoMock.subtle.deriveKey).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "PBKDF2",
        iterations: 10_000,
        hash: "SHA-256",
      }),
      expect.anything(),
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  });

  it("validates Additional Authenticated Data (AAD) during decryption", async () => {
    const keyBytes = new Uint8Array(nodeCrypto.randomBytes(32));
    const ivBytes = new Uint8Array(nodeCrypto.randomBytes(AES_GCM_IV_LENGTH));
    const aad = new TextEncoder().encode("asset-id:SPV-001");
    const { packedBlob } = packAesGcmPayload(
      "AAD protected payload",
      keyBytes,
      ivBytes,
      aad,
    );

    await expect(
      decryptBlobToText(packedBlob, keyBytes, aad),
    ).resolves.toBe("AAD protected payload");

    await expect(
      decryptBlobToText(
        packedBlob,
        keyBytes,
        new TextEncoder().encode("asset-id:WRONG"),
      ),
    ).rejects.toThrow(CryptoDecryptionError);
  });

  it("fails with CryptoDecryptionError when using the wrong key or tampered ciphertext/tag", async () => {
    const correctKey = new Uint8Array(nodeCrypto.randomBytes(32));
    const wrongKey = new Uint8Array(nodeCrypto.randomBytes(32));
    const ivBytes = new Uint8Array(nodeCrypto.randomBytes(AES_GCM_IV_LENGTH));
    const { packedBlob } = packAesGcmPayload(
      "Tamper-evident content",
      correctKey,
      ivBytes,
    );

    // Wrong key
    await expect(decryptPackedBlob(packedBlob, wrongKey)).rejects.toThrow(
      /authentication tag mismatch/i,
    );

    // Tampered ciphertext byte
    const tamperedCiphertext = new Uint8Array(packedBlob);
    tamperedCiphertext[AES_GCM_IV_LENGTH] ^= 0xff;
    await expect(
      decryptPackedBlob(tamperedCiphertext, correctKey),
    ).rejects.toThrow(CryptoDecryptionError);

    // Tampered auth tag byte
    const tamperedTag = new Uint8Array(packedBlob);
    tamperedTag[tamperedTag.length - 1] ^= 0x01;
    await expect(decryptPackedBlob(tamperedTag, correctKey)).rejects.toThrow(
      CryptoDecryptionError,
    );
  });

  it("rejects malformed IVs, truncated blobs, invalid keys, and missing Web Crypto API", async () => {
    const validKey = new Uint8Array(32);

    await expect(
      decryptAesGcm({
        ciphertext: new Uint8Array(AES_GCM_TAG_LENGTH_BYTES + 4),
        iv: new Uint8Array(8),
        key: validKey,
      }),
    ).rejects.toThrow(/invalid aes-gcm iv length/i);

    await expect(
      decryptAesGcm({
        ciphertext: new Uint8Array(10),
        iv: new Uint8Array(AES_GCM_IV_LENGTH),
        key: validKey,
      }),
    ).rejects.toThrow(/too short/i);

    await expect(
      decryptPackedBlob(new Uint8Array(20), validKey),
    ).rejects.toThrow(/expected at least 28 bytes/i);

    await expect(importAesGcmKey(new Uint8Array(24))).rejects.toThrow(
      /expected 16 or 32 bytes/i,
    );

    await expect(
      deriveAesGcmKeyFromPassphrase("", new Uint8Array(16)),
    ).rejects.toThrow(/passphrase cannot be empty/i);

    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    await expect(importAesGcmKey(validKey)).rejects.toThrow(
      /crypto\.subtle.*not available/i,
    );
  });
});
