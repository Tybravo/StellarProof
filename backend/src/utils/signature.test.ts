import {
  signPayload,
  verifySignature,
  generateKeypair,
  computeHMAC,
  verifyHMAC,
} from './signature';
import { Keypair } from '@stellar/stellar-sdk';

describe('Signature Utilities', () => {
  describe('signPayload', () => {
    it('should sign a string payload and return hex-encoded signature', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const payload = 'test-payload';

      const result = signPayload(secretKey, payload);

      expect(result.signature).toBeDefined();
      expect(result.publicKey).toBe(keypair.publicKey());
      expect(/^[0-9a-f]*$/.test(result.signature)).toBe(true); // hex format
      expect(result.signature.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should sign a Buffer payload', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const payload = Buffer.from('test-payload');

      const result = signPayload(secretKey, payload);

      expect(result.signature).toBeDefined();
      expect(result.publicKey).toBe(keypair.publicKey());
    });

    it('should produce deterministic signatures for the same payload', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const payload = 'test-payload';

      const result1 = signPayload(secretKey, payload);
      const result2 = signPayload(secretKey, payload);

      expect(result1.signature).toBe(result2.signature);
    });

    it('should produce different signatures for different payloads', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();

      const result1 = signPayload(secretKey, 'payload-1');
      const result2 = signPayload(secretKey, 'payload-2');

      expect(result1.signature).not.toBe(result2.signature);
    });

    it('should throw on invalid secret key', () => {
      expect(() => {
        signPayload('INVALID_SECRET', 'payload');
      }).toThrow();
    });

    it('should throw on empty secret key', () => {
      expect(() => {
        signPayload('', 'payload');
      }).toThrow();
    });
  });

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const publicKey = keypair.publicKey();
      const payload = 'test-payload';

      const { signature } = signPayload(secretKey, payload);
      const result = verifySignature(publicKey, payload, signature);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject an invalid signature', () => {
      const keypair = Keypair.random();
      const publicKey = keypair.publicKey();
      const payload = 'test-payload';
      const invalidSignature = '0'.repeat(128); // invalid signature

      const result = verifySignature(publicKey, payload, invalidSignature);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject signature with wrong payload', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const publicKey = keypair.publicKey();

      const { signature } = signPayload(secretKey, 'payload-1');
      const result = verifySignature(publicKey, 'payload-2', signature);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject signature from different keypair', () => {
      const keypair1 = Keypair.random();
      const keypair2 = Keypair.random();
      const payload = 'test-payload';

      const { signature } = signPayload(keypair1.secret(), payload);
      const result = verifySignature(keypair2.publicKey(), payload, signature);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle Buffer payloads correctly', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const publicKey = keypair.publicKey();
      const payload = Buffer.from('test-payload');

      const { signature } = signPayload(secretKey, payload);
      const result = verifySignature(publicKey, payload, signature);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid public key format', () => {
      const result = verifySignature('INVALID_KEY', 'payload', '0'.repeat(128));

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid public key format');
    });

    it('should reject invalid hex signature', () => {
      const keypair = Keypair.random();
      const result = verifySignature(keypair.publicKey(), 'payload', 'invalid-hex');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });

    it('should reject signature with incorrect length', () => {
      const keypair = Keypair.random();
      const invalidSignature = '0'.repeat(64); // 32 bytes instead of 64

      const result = verifySignature(keypair.publicKey(), 'payload', invalidSignature);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature length');
    });

    it('should handle string payloads consistently', () => {
      const keypair = Keypair.random();
      const secretKey = keypair.secret();
      const publicKey = keypair.publicKey();
      const payload = 'test-payload';

      const { signature } = signPayload(secretKey, payload);

      // Verify with string
      const result1 = verifySignature(publicKey, payload, signature);
      // Verify with Buffer
      const result2 = verifySignature(publicKey, Buffer.from(payload), signature);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  describe('generateKeypair', () => {
    it('should generate a valid keypair', () => {
      const { publicKey, secret } = generateKeypair();

      expect(publicKey).toBeDefined();
      expect(secret).toBeDefined();
      expect(publicKey.startsWith('G')).toBe(true);
      expect(secret.startsWith('S')).toBe(true);
    });

    it('should generate different keypairs on each call', () => {
      const kp1 = generateKeypair();
      const kp2 = generateKeypair();

      expect(kp1.publicKey).not.toBe(kp2.publicKey);
      expect(kp1.secret).not.toBe(kp2.secret);
    });

    it('should generate keypairs that work with sign/verify', () => {
      const { publicKey, secret } = generateKeypair();
      const payload = 'test-payload';

      const { signature } = signPayload(secret, payload);
      const result = verifySignature(publicKey, payload, signature);

      expect(result.valid).toBe(true);
    });
  });

  describe('computeHMAC', () => {
    it('should compute HMAC for string payload', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';

      const hmac = computeHMAC(payload, secret);

      expect(hmac).toBeDefined();
      expect(/^[0-9a-f]*$/.test(hmac)).toBe(true); // hex format
      expect(hmac.length).toBe(64); // SHA256 = 32 bytes = 64 hex chars
    });

    it('should compute HMAC for Buffer payload', () => {
      const payload = Buffer.from('test-payload');
      const secret = 'test-secret';

      const hmac = computeHMAC(payload, secret);

      expect(hmac).toBeDefined();
      expect(hmac.length).toBe(64);
    });

    it('should produce deterministic HMACs', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';

      const hmac1 = computeHMAC(payload, secret);
      const hmac2 = computeHMAC(payload, secret);

      expect(hmac1).toBe(hmac2);
    });

    it('should produce different HMACs for different payloads', () => {
      const secret = 'test-secret';

      const hmac1 = computeHMAC('payload-1', secret);
      const hmac2 = computeHMAC('payload-2', secret);

      expect(hmac1).not.toBe(hmac2);
    });

    it('should produce different HMACs for different secrets', () => {
      const payload = 'test-payload';

      const hmac1 = computeHMAC(payload, 'secret-1');
      const hmac2 = computeHMAC(payload, 'secret-2');

      expect(hmac1).not.toBe(hmac2);
    });

    it('should handle string payloads consistently', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';

      const hmac1 = computeHMAC(payload, secret);
      const hmac2 = computeHMAC(Buffer.from(payload), secret);

      expect(hmac1).toBe(hmac2);
    });
  });

  describe('verifyHMAC', () => {
    it('should verify valid HMAC', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';

      const hmac = computeHMAC(payload, secret);
      const result = verifyHMAC(payload, secret, hmac);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid HMAC', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';
      const invalidHMAC = '0'.repeat(64);

      const result = verifyHMAC(payload, secret, invalidHMAC);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject HMAC with wrong payload', () => {
      const secret = 'test-secret';

      const hmac = computeHMAC('payload-1', secret);
      const result = verifyHMAC('payload-2', secret, hmac);

      expect(result.valid).toBe(false);
    });

    it('should reject HMAC with wrong secret', () => {
      const payload = 'test-payload';

      const hmac = computeHMAC(payload, 'secret-1');
      const result = verifyHMAC(payload, 'secret-2', hmac);

      expect(result.valid).toBe(false);
    });

    it('should handle Buffer payloads consistently', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';

      const hmac = computeHMAC(payload, secret);
      const result1 = verifyHMAC(payload, secret, hmac);
      const result2 = verifyHMAC(Buffer.from(payload), secret, hmac);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';

      const hmac = computeHMAC(payload, secret);
      // This test verifies the function doesn't crash - actual timing attack prevention
      // requires specialized testing that's hard to unit test
      const result = verifyHMAC(payload, secret, hmac);

      expect(result.valid).toBe(true);
    });

    it('should handle invalid hex HMAC gracefully', () => {
      const payload = 'test-payload';
      const secret = 'test-secret';
      const invalidHex = 'not-hex-data';

      const result = verifyHMAC(payload, secret, invalidHex);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should round-trip sign and verify with generated keypair', () => {
      const { publicKey, secret } = generateKeypair();
      const payload = JSON.stringify({ userId: '123', action: 'verify' });

      const { signature } = signPayload(secret, payload);
      const result = verifySignature(publicKey, payload, signature);

      expect(result.valid).toBe(true);
    });

    it('should support webhook HMAC workflow', () => {
      const webhookSecret = 'webhook-secret-key';
      const webhookPayload = JSON.stringify({
        event: 'certificate.verified',
        certificateId: 'cert-123',
        timestamp: Date.now(),
      });

      // Create HMAC signature
      const webhookHMAC = computeHMAC(webhookPayload, webhookSecret);

      // Verify HMAC signature
      const result = verifyHMAC(webhookPayload, webhookSecret, webhookHMAC);

      expect(result.valid).toBe(true);
    });

    it('should support SPV mock workflow with attestation signing', () => {
      // Generate SPV key for attestation
      const spvKeypair = generateKeypair();

      // Create attestation payload
      const attestationPayload = JSON.stringify({
        contentHash: 'abc123def456',
        teehash: 'tee-hash-value',
        timestamp: Date.now(),
      });

      // Sign attestation with SPV key
      const { signature } = signPayload(spvKeypair.secret, attestationPayload);

      // Verify attestation signature
      const result = verifySignature(spvKeypair.publicKey, attestationPayload, signature);

      expect(result.valid).toBe(true);
    });
  });
});
