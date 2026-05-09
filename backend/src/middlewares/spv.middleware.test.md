# SPV Middleware Testing Guide

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Create or update `backend/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/stellarproof
MASTER_KEY=stellarproof-master-key-2024-secure
PORT=4000
NODE_ENV=development
```

### 3. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use your local MongoDB installation
mongod
```

### 4. Seed KMS Data

```bash
npm run seed:kms
```

This will create test users with active KMS keys.

### 5. Start the Server

```bash
npm run dev
```

Server should start on `http://localhost:4000`

## Testing Scenarios

### Scenario 1: Upload File with SPV Encryption (isSealed=true)

**Postman Configuration:**

1. Method: `POST`
2. URL: `http://localhost:4000/api/v1/spv/upload`
3. Headers: (automatically set by Postman for multipart/form-data)
4. Body: `form-data`
   - Key: `file`, Type: `File`, Value: [Select any image/document]
   - Key: `isSealed`, Type: `Text`, Value: `true`
   - Key: `userId`, Type: `Text`, Value: `[Use userId from seed script output]`
   - Key: `accessType`, Type: `Text`, Value: `private`

**Expected Response (201 Created):**

```json
{
  "status": "success",
  "message": "Encrypted asset uploaded and SPV record created successfully",
  "data": {
    "assetId": "507f1f77bcf86cd799439012",
    "spvRecordId": "507f1f77bcf86cd799439013",
    "fileName": "test-image.jpg",
    "isEncrypted": true,
    "encryptionKeyVersion": "v1",
    "isSealed": true,
    "accessType": "private",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Verification:**

- Check MongoDB `assets` collection for encrypted asset record
- Check MongoDB `spvrecords` collection for SPV record
- Verify `isEncrypted: true` and `encryptionKeyVersion` is set

### Scenario 2: Upload File without SPV (isSealed=false)

**Postman Configuration:**

Same as above, but set `isSealed` to `false`

**Expected Behavior:**

- Middleware passes through without encryption
- File is not encrypted
- No SPV record is created (unless controller handles non-encrypted uploads)

### Scenario 3: Get SPV Record by Asset ID

**Postman Configuration:**

1. Method: `GET`
2. URL: `http://localhost:4000/api/v1/spv/records/[assetId from upload response]`

**Expected Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "assetId": {
      "_id": "507f1f77bcf86cd799439012",
      "fileName": "test-image.jpg",
      "isEncrypted": true
    },
    "creatorId": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "test@example.com"
    },
    "kmsKeyId": {
      "_id": "507f1f77bcf86cd799439010",
      "keyVersion": "v1",
      "isActive": true
    },
    "accessType": "private",
    "isSealed": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Scenario 4: Get All SPV Records for User

**Postman Configuration:**

1. Method: `GET`
2. URL: `http://localhost:4000/api/v1/spv/records/user/[userId]`

**Expected Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "records": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "assetId": {...},
        "creatorId": "507f1f77bcf86cd799439011",
        "kmsKeyId": {...},
        "accessType": "private",
        "isSealed": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

### Scenario 5: Update Sealed Status

**Postman Configuration:**

1. Method: `PATCH`
2. URL: `http://localhost:4000/api/v1/spv/records/[spvRecordId]/seal`
3. Headers: `Content-Type: application/json`
4. Body: `raw (JSON)`

```json
{
  "isSealed": false
}
```

**Expected Response (200 OK):**

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

## Error Scenarios

### Missing File

**Request:** Upload without file

**Expected Response (400):**

```json
{
  "status": "error",
  "message": "No file provided for SPV upload"
}
```

### Missing userId

**Request:** Upload without userId

**Expected Response (400):**

```json
{
  "status": "error",
  "message": "userId is required for SPV upload"
}
```

### Invalid userId Format

**Request:** Upload with invalid userId (e.g., "invalid-id")

**Expected Response (400):**

```json
{
  "status": "error",
  "message": "Invalid userId format"
}
```

### No Active KMS Key

**Request:** Upload with userId that has no active KMS key

**Expected Response (404):**

```json
{
  "status": "error",
  "message": "No active encryption key found. Please initialize KMS first."
}
```

## cURL Examples

### Upload with SPV Encryption

```bash
curl -X POST http://localhost:4000/api/v1/spv/upload \
  -F "file=@./test-image.jpg" \
  -F "isSealed=true" \
  -F "userId=507f1f77bcf86cd799439011" \
  -F "accessType=private"
```

### Get SPV Record

```bash
curl -X GET http://localhost:4000/api/v1/spv/records/507f1f77bcf86cd799439012
```

### Get User SPV Records

```bash
curl -X GET http://localhost:4000/api/v1/spv/records/user/507f1f77bcf86cd799439011
```

### Update Sealed Status

```bash
curl -X PATCH http://localhost:4000/api/v1/spv/records/507f1f77bcf86cd799439013/seal \
  -H "Content-Type: application/json" \
  -d '{"isSealed": false}'
```

## Verification Checklist

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] KMS seed data created
- [ ] File upload with `isSealed=true` returns 201
- [ ] Asset record created in database with `isEncrypted=true`
- [ ] SPV record created and linked to asset
- [ ] Encryption key version recorded correctly
- [ ] GET endpoints return correct data
- [ ] PATCH endpoint updates sealed status
- [ ] Error handling works for all scenarios
- [ ] No sensitive data exposed in error messages (production mode)

## Database Verification

### Check Assets Collection

```javascript
// In MongoDB shell or Compass
db.assets.find({ isEncrypted: true }).pretty();
```

### Check SPV Records Collection

```javascript
db.spvrecords.find().pretty();
```

### Check KMS Keys Collection

```javascript
db.kmskeys.find({ isActive: true }).pretty();
```

## Performance Testing

### Upload Multiple Files

```bash
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/v1/spv/upload \
    -F "file=@./test-image.jpg" \
    -F "isSealed=true" \
    -F "userId=507f1f77bcf86cd799439011" \
    -F "accessType=private"
done
```

### Monitor Response Times

- Single file upload: < 500ms
- Encryption overhead: < 100ms
- Database operations: < 200ms

## Troubleshooting

### Issue: "No active KMS key found"

**Solution:** Run the seed script:

```bash
npm run seed:kms
```

### Issue: "Cannot find module 'multer'"

**Solution:** Install dependencies:

```bash
npm install
```

### Issue: MongoDB connection error

**Solution:** Ensure MongoDB is running and connection string is correct in `.env`

### Issue: TypeScript compilation errors

**Solution:** Rebuild the project:

```bash
npm run build
```
