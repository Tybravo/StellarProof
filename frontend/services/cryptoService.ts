/**
 * Browser decryption for Sealed Provenance Vault blobs.
 * AES-GCM via the Web Crypto API. The KMS key is raw bytes the caller already retrieved.
 */

export async function decryptAesGcm(
  encrypted: BufferSource,
  keyBytes: BufferSource,
  iv: BufferSource
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new Uint8Array(plain);
}
