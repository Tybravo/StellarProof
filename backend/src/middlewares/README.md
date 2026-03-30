# SPV Middleware Documentation

## Overview

The SPV (Sealed Provenance Vault) middleware intercepts media uploads flagged for encryption and routes them through the KMS service before they reach external storage.

## Architecture

The implementation follows strict layered architecture:

```
Request → Multer → SPV Middleware → Controller → Service → Model → Database
```

### Components

1. **Middleware** (`spv.middleware.ts`): Intercepts requests and handles encryption
2. **Controller** (`spv.controller.ts`): Handles HTTP requests/responses
3. **Service** (`spv.service.ts`): Contains business logic for encryption and SPV operations
4. **Model** (`SPVRecord.model.ts`): Database schema for SPV records

## How It Works

### Upload Flow

1. Client sends POST request to `/api/v1/spv/upload` with:
   - File (multipart/form-data)
   - `isSealed: true` in request body
   - `userId` in request body
   - Optional: `accessType`, `allowedUsers`, `nftContractAddress`

2. **Multer** processes the file upload and stores it in memory buffer

3. **SPV Middleware** checks `req.body.isSealed`:
   - If `false` or not present: passes through without encryption
   - If `true`:
     - Retrieves user's active KMS key
     - Encrypts file buffer using AES-256-GCM
     - Attaches encrypted data to `req.body.encryptedFile`

4. **Controller** receives encrypted data and:
   - Creates Asset record in database
   - Creates SPV record linking asset to KMS key
   - Returns success response with asset and SPV record IDs

## API Endpoints

### POST /api/v1/spv/upload

Upload and encrypt a file for SPV.

**Request:**

```bash
curl -X POST http://localhost:4000/api/v1/spv/upload \
  -F "file=@/path/to/file.jpg" \
  -F "isSealed=true" \
  -F "userId=507f1f77bcf86cd799439011" \
  -F "accessType=private"
```

**Response:**

```json
{
  "status": "success",
  "message": "Encrypted asset uploaded and SPV record created successfully",
  "data": {
    "assetId": "507f1f77bcf86cd799439012",
    "spvRecordId": "507f1f77bcf86cd799439013",
    "fileName": "file.jpg",
    "isEncrypted": true,
    "encryptionKeyVersion": "v1",
    "isSealed": true,
    "accessType": "private",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/v1/spv/records/:assetId

Get SPV record by asset ID.

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "assetId": "507f1f77bcf86cd799439012",
    "creatorId": "507f1f77bcf86cd799439011",
    "kmsKeyId": "507f1f77bcf86cd799439010",
    "accessType": "private",
    "isSealed": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/v1/spv/records/user/:userId

Get all SPV records for a user.

**Response:**

```json
{
  "status": "success",
  "data": {
    "records": [...],
    "count": 5
  }
}
```

### PATCH /api/v1/spv/records/:id/seal

Update sealed status of an SPV record.

**Request:**

```json
{
  "isSealed": false
}
```

**Response:**

```json
{
  "status": "success",
  "message": "SPV record unsealed successfully",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "isSealed": false,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Security Features

1. **AES-256-GCM Encryption**: Industry-standard authenticated encryption
2. **Key Versioning**: Each encryption uses a specific KMS key version
3. **Master Key Protection**: Symmetric keys are encrypted with a master key
4. **Access Control**: SPV records support multiple access types:
   - `private`: Only creator can access
   - `public_with_conditions`: Conditional access
   - `nft_holders_only`: Gated by NFT ownership
   - `specific_users`: Whitelist of allowed users

## Error Handling

The middleware handles various error scenarios:

- Missing file: 400 Bad Request
- Missing userId: 400 Bad Request
- Invalid userId format: 400 Bad Request
- No active KMS key: 404 Not Found
- Encryption failure: 500 Internal Server Error

## Testing

### Prerequisites

1. Install dependencies:

```bash
cd backend
npm install
```

2. Set up environment variables in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/stellarproof
MASTER_KEY=your-secure-master-key-here
PORT=4000
```

3. Seed KMS data:

```bash
npm run seed:kms
```

### Testing with Postman

1. Create a user and initialize KMS key (use seed script)
2. Upload a file with SPV encryption:
   - Method: POST
   - URL: `http://localhost:4000/api/v1/spv/upload`
   - Body: form-data
     - `file`: [select file]
     - `isSealed`: true
     - `userId`: [your user ID]
     - `accessType`: private

3. Verify the response contains encrypted asset details

## Integration with Storage Orchestrator

The middleware prepares encrypted data for the Storage Orchestrator:

```typescript
req.body.encryptedFile = {
  buffer: encryptedBuffer, // Encrypted file data
  iv: string, // Initialization vector
  authTag: string, // Authentication tag
  keyVersion: string, // KMS key version used
  originalFileName: string, // Original file name
  mimeType: string, // MIME type
  size: number, // Original file size
};
```

The Storage Orchestrator can then:

1. Store the encrypted buffer to IPFS/S3/MongoDB
2. Use the IV and authTag for future decryption
3. Track which key version was used

## Future Enhancements

1. Implement actual storage integration (IPFS/S3)
2. Add decryption endpoint with access control validation
3. Implement NFT-gated access verification
4. Add audit logging for encryption/decryption operations
5. Support for streaming large files
6. Rate limiting for upload endpoints
