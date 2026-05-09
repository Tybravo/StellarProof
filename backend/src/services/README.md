# KMS Service Documentation

## Overview

The KMS (Key Management Service) handles cryptographic key operations for StellarProof, including key generation, rotation, and management.

## Key Rotation Feature

### Purpose

Allows users to rotate the keys protecting their SPV assets. This is a critical security feature that:

- Generates a new key version
- Decrypts existing assets with the old key
- Re-encrypts assets with the new key
- Updates the KMSKey document to the new version
- Deactivates the old key

### API Endpoints

#### 1. Rotate Key

**POST** `/api/v1/kms/rotate`

Rotates the active KMS key for a user and re-encrypts all associated assets.

**Request Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011"
}
```

**Success Response (200):**

```json
{
  "status": "success",
  "message": "Key rotation completed successfully",
  "data": {
    "oldKeyVersion": "v1",
    "newKeyVersion": "v2",
    "assetsReEncrypted": 5,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid or missing userId
- `404 Not Found`: No active KMS key found for user
- `500 Internal Server Error`: Server error during rotation

#### 2. Get All Keys

**GET** `/api/v1/kms/keys/:userId`

Retrieves all KMS keys (active and inactive) for a user.

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "keys": [
      {
        "id": "507f1f77bcf86cd799439011",
        "keyVersion": "v2",
        "algorithm": "AES-256-GCM",
        "isActive": true,
        "expiresAt": null,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "keyVersion": "v1",
        "algorithm": "AES-256-GCM",
        "isActive": false,
        "expiresAt": null,
        "createdAt": "2024-01-10T08:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 2
  }
}
```

#### 3. Get Active Key

**GET** `/api/v1/kms/keys/:userId/active`

Retrieves the currently active KMS key for a user.

**Success Response (200):**

```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "keyVersion": "v2",
    "algorithm": "AES-256-GCM",
    "isActive": true,
    "expiresAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Invalid userId format
- `404 Not Found`: No active key found for user
- `500 Internal Server Error`: Server error

### Security Considerations

1. **Master Key**: The service uses a master key (stored in `MASTER_KEY` environment variable) to encrypt/decrypt KMS keys before storing them in the database.

2. **AES-256-GCM**: Uses AES-256-GCM encryption algorithm which provides both confidentiality and authenticity.

3. **Transaction Safety**: Key rotation uses MongoDB transactions to ensure atomicity - either all operations succeed or all are rolled back.

4. **Key Versioning**: Keys are versioned (v1, v2, v3, etc.) to track rotation history.

### Implementation Details

#### Encryption Flow

1. Generate a 256-bit symmetric key
2. Encrypt the symmetric key with the master key using AES-256-GCM
3. Store the encrypted key, IV, and auth tag in the database

#### Rotation Flow

1. Start a MongoDB transaction
2. Find the active key for the user
3. Increment the version number (v1 → v2)
4. Decrypt the old symmetric key using the master key
5. Generate a new symmetric key
6. Encrypt the new key with the master key
7. Find all assets encrypted with the old key version
8. Update asset metadata to reference the new key version
9. Deactivate the old key
10. Create and save the new key document
11. Commit the transaction

### Environment Variables

Add to your `.env` file:

```
MASTER_KEY=your-secure-master-key-change-in-production
```

**Important**: In production, the master key should be:

- Randomly generated with high entropy
- Stored in a secure secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- Never committed to version control
- Rotated periodically

### Testing with Postman

1. **Setup**: Ensure you have a user with an active KMS key in the database
2. **Rotate Key**: POST to `/api/v1/kms/rotate` with userId in body
3. **Verify**: GET `/api/v1/kms/keys/:userId` to see both old (inactive) and new (active) keys
4. **Check Active**: GET `/api/v1/kms/keys/:userId/active` to confirm the new key is active

### Future Enhancements

- Implement actual asset data re-encryption (currently only updates metadata)
- Add support for scheduled key rotation
- Implement key expiration policies
- Add audit logging for all key operations
- Support for multiple encryption algorithms
- Integration with external KMS providers (AWS KMS, Azure Key Vault)
