/**
 * Tests for SHA256 Validation Utility
 */

import { isValidSHA256, validateSHA256 } from '../validation';

describe('SHA256 Validation Utility', () => {
  describe('isValidSHA256', () => {
    test('should return true for valid 64-character hexadecimal strings', () => {
      const validHashes = [
        'a'.repeat(64), // all lowercase a
        'A'.repeat(64), // all uppercase A
        '0'.repeat(64), // all zeros
        'f'.repeat(64), // all lowercase f
        'F'.repeat(64), // all uppercase F
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', // mixed hex
        'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890', // mixed uppercase
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // mixed case and numbers
      ];

      validHashes.forEach(hash => {
        expect(isValidSHA256(hash)).toBe(true);
      });
    });

    test('should return false for strings with wrong length', () => {
      const invalidLengths = [
        '', // empty
        'a'.repeat(63), // too short
        'a'.repeat(65), // too long
        'a'.repeat(32), // half length
        'a'.repeat(128), // double length
      ];

      invalidLengths.forEach(hash => {
        expect(isValidSHA256(hash)).toBe(false);
      });
    });

    test('should return false for strings with non-hexadecimal characters', () => {
      const invalidChars = [
        'g'.repeat(64), // invalid character
        'z'.repeat(64), // invalid character
        'a'.repeat(63) + 'g', // one invalid char at end
        'g' + 'a'.repeat(63), // one invalid char at start
        'a'.repeat(32) + 'g' + 'a'.repeat(31), // invalid char in middle
        'a'.repeat(64).toUpperCase().replace('A', 'Z'), // mixed with invalid
      ];

      invalidChars.forEach(hash => {
        expect(isValidSHA256(hash)).toBe(false);
      });
    });

    test('should return false for edge cases', () => {
      expect(isValidSHA256(null as any)).toBe(false);
      expect(isValidSHA256(undefined as any)).toBe(false);
      expect(isValidSHA256(123 as any)).toBe(false);
      expect(isValidSHA256({} as any)).toBe(false);
      expect(isValidSHA256([] as any)).toBe(false);
    });
  });

  describe('validateSHA256', () => {
    test('should return null for valid 64-character hexadecimal strings', () => {
      const validHashes = [
        'a'.repeat(64),
        'A'.repeat(64),
        '0'.repeat(64),
        'f'.repeat(64),
        'F'.repeat(64),
        'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ];

      validHashes.forEach(hash => {
        expect(validateSHA256(hash)).toBe(null);
      });
    });

    test('should return appropriate error message for null input', () => {
      expect(validateSHA256(null as any)).toBe('Hash cannot be null or undefined');
    });

    test('should return appropriate error message for undefined input', () => {
      expect(validateSHA256(undefined as any)).toBe('Hash cannot be null or undefined');
    });

    test('should return appropriate error message for empty string', () => {
      expect(validateSHA256('')).toBe('Hash cannot be empty');
    });

    test('should return appropriate error message for non-string input', () => {
      expect(validateSHA256(123 as any)).toBe('Hash must be a string');
      expect(validateSHA256({} as any)).toBe('Hash must be a string');
      expect(validateSHA256([] as any)).toBe('Hash must be a string');
    });

    test('should return appropriate error message for wrong length', () => {
      expect(validateSHA256('a'.repeat(63))).toBe('Hash must be exactly 64 characters long, got 63');
      expect(validateSHA256('a'.repeat(65))).toBe('Hash must be exactly 64 characters long, got 65');
      expect(validateSHA256('a'.repeat(32))).toBe('Hash must be exactly 64 characters long, got 32');
      expect(validateSHA256('')).toBe('Hash cannot be empty'); // empty string has specific message
    });

    test('should return appropriate error message for non-hexadecimal characters', () => {
      expect(validateSHA256('g'.repeat(64))).toBe('Hash must contain only hexadecimal characters (a-f, A-F, 0-9)');
      expect(validateSHA256('z'.repeat(64))).toBe('Hash must contain only hexadecimal characters (a-f, A-F, 0-9)');
      expect(validateSHA256('a'.repeat(63) + 'g')).toBe('Hash must contain only hexadecimal characters (a-f, A-F, 0-9)');
      expect(validateSHA256('g' + 'a'.repeat(63))).toBe('Hash must contain only hexadecimal characters (a-f, A-F, 0-9)');
      expect(validateSHA256('a'.repeat(32) + 'g' + 'a'.repeat(31))).toBe('Hash must contain only hexadecimal characters (a-f, A-F, 0-9)');
    });

    test('should handle real-world SHA256 hash examples', () => {
      // Real SHA256 hashes for testing
      const realHashes = [
        '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', // "hello"
        '486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7', // "world"
        '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', // "test"
      ];

      realHashes.forEach(hash => {
        expect(validateSHA256(hash)).toBe(null);
        expect(isValidSHA256(hash)).toBe(true);
      });
    });
  });
});
