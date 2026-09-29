# Signature Utilities Documentation

## Overview

The `signature.ts` utility module provides ED25519 signing and signature verification capabilities using Stellar-compatible keys. It's designed for:

- **SPV Mock**: Test key generation and signing
- **Attestation**: Signing attestation reports with TEE keys
- **Webhook HMAC**: Secure webhook payload verification

All signatures are **hex-encoded** for consistent transport and storage.

## API Reference

### Core ED25519 Functions

#### `signPayload(secretKey: string, payload: string | Buffer): SignatureResult`

Signs a payload using an ED25519 secret key.

**Parameters:**
- `secretKey` - Stellar secret key (starts with 'S')
- `payload` - Data to sign (string or Buffer)

**Returns:**
```typescript
{
  signature: string;    // hex-encoded 64-byte signature
  publicKey: string;    // Stellar public key
}
```

**Example:**
```typescript
import { signPayload } from './utils/signature';

const result = signPayload('SBXYZ...', 'my-payload');
console.log(result.signature); // abc123def456...
console.log(result.publicKey); // GBXYZ...
```

---

#### `verifySignature(publicKey: string, payload: string | Buffer, signature: string): VerificationResult`

Verifies a signature using the public key.

**Parameters:**
- `publicKey` - Stellar public key (starts with 'G')
- `payload` - Original data that was signed
- `signature` - hex-encoded signature to verify

**Returns:**
```typescript
{
  valid: boolean;
  error?: string;  // Only present if valid is false
}
```

**Example:**
```typescript
import { verifySignature } from './utils/signature';

const result = verifySignature('GBXYZ...', 'my-payload', 'abc123def456...');
if (result.valid) {
  console.log('Signature is valid!');
} else {
  console.log('Error:', result.error);
}
```

---

#### `generateKeypair(): { publicKey: string; secret: string }`

Generates a new ED25519 keypair for testing or attestation.

**Returns:**
```typescript
{
  publicKey: string;  // Stellar public key (G...)
  secret: string;     // Stellar secret key (S...)
}
```

**Example:**
```typescript
import { generateKeypair } from './utils/signature';

const { publicKey, secret } = generateKeypair();
console.log('Public Key:', publicKey);
console.log('Secret Key:', secret);
```

---

### HMAC Functions (Webhook Verification)

#### `computeHMAC(payload: string | Buffer, secret: string): string`

Computes an HMAC-SHA256 hash for webhook payloads.

**Parameters:**
- `payload` - Webhook payload (string or Buffer)
- `secret` - HMAC secret key

**Returns:** hex-encoded HMAC (64 characters = 32 bytes)

**Example:**
```typescript
import { computeHMAC } from './utils/signature';

const hmac = computeHMAC('webhook-payload', 'my-secret');
// Result: "a1b2c3d4e5f6..."
```

---

#### `verifyHMAC(payload: string | Buffer, secret: string, expectedHMAC: string): VerificationResult`

Verifies an HMAC signature using timing-safe comparison.

**Parameters:**
- `payload` - Webhook payload
- `secret` - HMAC secret key
- `expectedHMAC` - hex-encoded HMAC to verify against

**Returns:**
```typescript
{
  valid: boolean;
  error?: string;
}
```

**Example:**
```typescript
import { verifyHMAC } from './utils/signature';

const result = verifyHMAC('webhook-payload', 'my-secret', 'a1b2c3d4e5f6...');
if (result.valid) {
  console.log('Webhook signature is valid!');
}
```

---

## Usage Patterns

### Pattern 1: SPV Mock Attestation Signing

```typescript
import { generateKeypair, signPayload, verifySignature } from './utils/signature';

// Generate SPV test keypair
const spvKey = generateKeypair();

// Create attestation payload
const attestation = {
  contentHash: 'abc123def456',
  teehash: 'tee-hash-value',
  timestamp: Date.now(),
};

// Sign the attestation
const { signature, publicKey } = signPayload(
  spvKey.secret,
  JSON.stringify(attestation)
);

// Verify the signature
const result = verifySignature(
  publicKey,
  JSON.stringify(attestation),
  signature
);

console.log('Attestation valid:', result.valid);
```

---

### Pattern 2: Webhook HMAC Verification

```typescript
import { computeHMAC, verifyHMAC } from './utils/signature';

// In webhook handler
export async function handleWebhook(req: Request) {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const payload = JSON.stringify(req.body);
  const receivedHMAC = req.headers['x-signature'];

  // Verify webhook signature
  const result = verifyHMAC(payload, webhookSecret, receivedHMAC);

  if (!result.valid) {
    throw new AppError('Invalid webhook signature', 401);
  }

  // Process webhook
  processWebhookData(req.body);
}

// In webhook sender (external service)
function sendWebhook(event: any, secret: string) {
  const payload = JSON.stringify(event);
  const signature = computeHMAC(payload, secret);

  fetch('https://example.com/webhook', {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
    },
  });
}
```

---

### Pattern 3: Service Layer Integration

```typescript
import { signPayload, verifySignature } from './utils/signature';
import { AppError } from './errors/AppError';

export class VerificationService {
  async signAttestation(secretKey: string, attestationData: any) {
    try {
      const payload = JSON.stringify(attestationData);
      const result = signPayload(secretKey, payload);
      return result;
    } catch (error) {
      throw new AppError('Failed to sign attestation', 500);
    }
  }

  async verifyAttestation(
    publicKey: string,
    attestationData: any,
    signature: string
  ) {
    try {
      const payload = JSON.stringify(attestationData);
      const result = verifySignature(publicKey, payload, signature);

      if (!result.valid) {
        throw new AppError(
          `Attestation verification failed: ${result.error}`,
          401
        );
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Attestation verification error', 500);
    }
  }
}
```

---

## Security Considerations

### 1. Timing-Safe HMAC Verification

The `verifyHMAC` function uses `crypto.timingSafeEqual()` to prevent timing attacks:

```typescript
// Prevents leaking secrets based on comparison speed
const isValid = crypto.timingSafeEqual(computedBuffer, expectedBuffer);
```

### 2. ED25519 Determinism

ED25519 signatures are deterministic - the same secret and payload always produce the same signature. This is useful for:
- Testing and validation
- Reproducible audits
- But NOT for replay protection (use timestamps/nonces for that)

### 3. Secret Key Storage

Never hardcode secret keys. Use environment variables:

```typescript
const attestationSecret = process.env.ATTESTATION_SECRET_KEY;
```

### 4. Payload Canonicalization

For consistent verification, always serialize payloads the same way:

```typescript
// ✅ Good: Use deterministic serialization
import { canonicalStringify } from './crypto';
const payload = canonicalStringify(data);

// ❌ Bad: Different serialization order each time
const payload = JSON.stringify(data);
```

---

## Error Handling

All functions include comprehensive error handling:

```typescript
// signPayload throws errors
try {
  const result = signPayload(secretKey, payload);
} catch (error) {
  console.error('Signing failed:', error.message);
  // Handle error
}

// verifySignature and verifyHMAC return error info
const result = verifySignature(publicKey, payload, signature);
if (!result.valid) {
  console.error('Verification failed:', result.error);
  // Handle invalid signature
}
```

---

## Dependencies

- `@stellar/stellar-sdk` - ED25519 keypair operations
- `crypto` - Node.js built-in for HMAC and timing-safe comparison
- `winston` - Logging (via logger.ts)

---

## Testing

Comprehensive tests are provided in `signature.test.ts`:

- ED25519 sign/verify round-trips
- Invalid key/signature rejection
- Deterministic signature generation
- HMAC computation and verification
- Timing-safe comparison
- Integration workflows

Run tests with:
```bash
npm test -- src/utils/signature.test.ts
```

---

## Related Files

- `src/utils/crypto.ts` - Deterministic hashing utilities
- `src/utils/logger.ts` - Logging configuration
- `src/errors/AppError.ts` - Error handling patterns
