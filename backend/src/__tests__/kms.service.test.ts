import { kmsService } from '../../src/services/kms.service';

describe('KMS Service (AES-256-GCM)', () => {
  const plaintextString = 'StellarProof Secret Payload 2026';
  const plaintextBuffer = Buffer.from(plaintextString, 'utf-8');
  let testKey: Buffer;

  beforeAll(() => {
    // Generate a fresh 32-byte key before running tests
    testKey = kmsService.generateSymmetricKey();
  });

  it('should successfully encrypt and decrypt a buffer', () => {
    // 1. Encrypt
    const encryptedBuffer = kmsService.encryptBuffer(plaintextBuffer, testKey);
    
    // Ensure the output is longer than the input (due to the 12-byte IV and 16-byte Auth Tag)
    expect(encryptedBuffer.length).toBe(plaintextBuffer.length + 12 + 16);
    expect(encryptedBuffer).not.toEqual(plaintextBuffer);

    // 2. Decrypt
    const decryptedBuffer = kmsService.decryptBuffer(encryptedBuffer, testKey);
    
    // Ensure it matches the original string perfectly
    expect(decryptedBuffer.toString('utf-8')).toEqual(plaintextString);
  });

  it('should throw an error with an incorrect key size', () => {
    // Create a 16-byte (128-bit) key instead of a 32-byte (256-bit) key
    const badKey = Buffer.alloc(16);
    
    expect(() => kmsService.encryptBuffer(plaintextBuffer, badKey)).toThrow(
      'Invalid KMS key length. AES-256 requires exactly a 32-byte key.'
    );
  });
});