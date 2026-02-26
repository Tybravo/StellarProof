/**
 * Manifest Hash Generator
 * Computes SHA-256 hashes of manifest content in real-time using the Web Crypto API.
 * Hash output matches standard CLI tools (e.g., `shasum -a 256`).
 *
 * @module utils/crypto
 * @see Issue #62 – Frontend: Manifest Hash Generator
 */

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    parts.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return parts.join("");
}

/**
 * Compute the SHA-256 hash of a UTF-8 string.
 *
 * @param text - The text content to hash (e.g. manifest JSON/XML)
 * @returns A lowercase hex-encoded SHA-256 hash (64 characters)
 */
export async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(digest);
}

/**
 * Validate that a string is a well-formed SHA-256 hex hash.
 *
 * @param hash - The string to validate
 * @returns `true` if the string is exactly 64 hex characters
 */
export function isValidSHA256(hash: string | null | undefined): boolean {
  if (!hash) return false;
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validate a SHA-256 hash string and return a descriptive error or `null`.
 *
 * @param hash - The string to validate
 * @returns An error message if invalid, or `null` if valid
 */
export function validateSHA256(hash: string | null | undefined): string | null {
  if (hash === null || hash === undefined || hash === "") {
    return "Hash value is required.";
  }
  if (hash.length !== 64) {
    return `Hash must be exactly 64 characters (got ${hash.length}).`;
  }
  if (!/^[a-fA-F0-9]+$/.test(hash)) {
    return "Hash must contain only hexadecimal characters (0-9, a-f, A-F).";
  }
  return null;
}
