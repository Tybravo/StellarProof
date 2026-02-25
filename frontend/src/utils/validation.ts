/**
 * SHA256 Validation Utility
 * 
 * Provides validation functions for SHA256 hash strings in hexadecimal format.
 */

/**
 * Regular expression pattern for SHA256 hexadecimal strings
 * Matches exactly 64 hexadecimal characters (a-f, A-F, 0-9)
 */
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;

/**
 * Validates if a string is a valid SHA256 hash in hexadecimal format
 * 
 * @param hash - The string to validate
 * @returns boolean - True if valid SHA256 hash, false otherwise
 */
export function isValidSHA256(hash: string): boolean {
  // Handle edge cases: null, undefined, empty string
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  return SHA256_REGEX.test(hash);
}

/**
 * Validates a SHA256 hash and returns an error message if invalid
 * 
 * @param hash - The string to validate
 * @returns string | null - Error message if invalid, null if valid
 */
export function validateSHA256(hash: string): string | null {
  // Handle edge cases: null, undefined
  if (hash === null || hash === undefined) {
    return 'Hash cannot be null or undefined';
  }
  
  // Handle empty string
  if (hash === '') {
    return 'Hash cannot be empty';
  }
  
  // Handle non-string input
  if (typeof hash !== 'string') {
    return 'Hash must be a string';
  }
  
  // Check length
  if (hash.length !== 64) {
    return `Hash must be exactly 64 characters long, got ${hash.length}`;
  }
  
  // Check for valid hexadecimal characters
  if (!SHA256_REGEX.test(hash)) {
    return 'Hash must contain only hexadecimal characters (a-f, A-F, 0-9)';
  }
  
  // All validations passed
  return null;
}
