# KMS Key Rotation - Testing Guide

This guide will help you test the KMS key rotation feature implementation.

## Prerequisites

1. **Environment Setup**
   - Ensure you have Node.js installed (v16 or higher)
   - MongoDB connection string (request from maintainer or use local MongoDB)
   - Create a `.env` file based on `.env.example`

2. **Required Environment Variables**
   ```env
   PORT=4000
   NODE_ENV=development
   MONGODB_URI=your-mongodb-connection-string
   MASTER_KEY=your-secure-master-key-for-testing
   ```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Seed Test Data

This will create a test user with an active KMS key (v1) and 5 encrypted assets:

```bash
pnpm seed:kms
```

**Expected Output:**

```
🌱 Starting KMS data seeding...

✅ Created test user: 507f1f77bcf86cd799439011
✅ Created KMS key v1 for user: 507f1f77bcf86cd799439012
✅ Created encrypted asset: contract_document.pdf
✅ Created encrypted asset: identity_verification.jpg
✅ Created encrypted asset: financial_statement.xlsx
✅ Created encrypted asset: legal_agreement.docx
✅ Created encrypted asset: medical_record.pdf

🎉 Seeding completed successfully!

📝 Test User ID: 507f1f77bcf86cd799439011

You can now test the key rotation API with this userId.
```

**Important:** Save the Test User ID from the output - you'll need it for testing!

### 3. Start the Development Server

```bash
pnpm dev
```

**Expected Output:**

```
Server is running on port 4000
MongoDB Connected: <your-cluster-url>
```

## API Testing

### Option 1: Using Postman

#### Test 1: Get Active Key (Before Rotation)

- **Method:** GET
- **URL:** `http://localhost:4000/api/v1/kms/keys/{userId}/active`
- **Replace** `{userId}` with your Test User ID

**Expected Response:**

```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "keyVersion": "v1",
    "algorithm": "AES-256-GCM",
    "isActive": true,
    "expiresAt": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### Test 2: Rotate Key

- **Method:** POST
- **URL:** `http://localhost:4000/api/v1/kms/rotate`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011"
}
```

**Expected Response:**

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

#### Test 3: Get All Keys (After Rotation)

- **Method:** GET
- **URL:** `http://localhost:4000/api/v1/kms/keys/{userId}`

**Expected Response:**

```json
{
  "status": "success",
  "data": {
    "keys": [
      {
        "id": "507f1f77bcf86cd799439013",
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
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 2
  }
}
```

#### Test 4: Get Active Key (After Rotation)

- **Method:** GET
- **URL:** `http://localhost:4000/api/v1/kms/keys/{userId}/active`

**Expected Response:**

```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "keyVersion": "v2",
    "algorithm": "AES-256-GCM",
    "isActive": true,
    "expiresAt": null,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Test 5: Rotate Key Again (v2 → v3)

- **Method:** POST
- **URL:** `http://localhost:4000/api/v1/kms/rotate`
- **Body:**

```json
{
  "userId": "507f1f77bcf86cd799439011"
}
```

**Expected Response:**

```json
{
  "status": "success",
  "message": "Key rotation completed successfully",
  "data": {
    "oldKeyVersion": "v2",
    "newKeyVersion": "v3",
    "assetsReEncrypted": 5,
    "timestamp": "2024-01-15T10:45:00.000Z"
  }
}
```

### Option 2: Using cURL

#### Get Active Key

```bash
curl http://localhost:4000/api/v1/kms/keys/507f1f77bcf86cd799439011/active
```

#### Rotate Key

```bash
curl -X POST http://localhost:4000/api/v1/kms/rotate \
  -H "Content-Type: application/json" \
  -d '{"userId":"507f1f77bcf86cd799439011"}'
```

#### Get All Keys

```bash
curl http://localhost:4000/api/v1/kms/keys/507f1f77bcf86cd799439011
```

## Error Testing

### Test Invalid User ID

```bash
curl -X POST http://localhost:4000/api/v1/kms/rotate \
  -H "Content-Type: application/json" \
  -d '{"userId":"invalid-id"}'
```

**Expected Response (400):**

```json
{
  "status": "error",
  "message": "Invalid userId format"
}
```

### Test Missing User ID

```bash
curl -X POST http://localhost:4000/api/v1/kms/rotate \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (400):**

```json
{
  "status": "error",
  "message": "userId is required in request body"
}
```

### Test Non-Existent User

```bash
curl -X POST http://localhost:4000/api/v1/kms/rotate \
  -H "Content-Type: application/json" \
  -d '{"userId":"507f1f77bcf86cd799439999"}'
```

**Expected Response (404):**

```json
{
  "status": "error",
  "message": "No active KMS key found for user"
}
```

## Verification Checklist

- [ ] Server starts without errors
- [ ] Seed script creates test data successfully
- [ ] GET active key returns v1 before rotation
- [ ] POST rotate key successfully rotates from v1 to v2
- [ ] Response shows 5 assets were re-encrypted
- [ ] GET all keys shows both v1 (inactive) and v2 (active)
- [ ] GET active key returns v2 after rotation
- [ ] Second rotation successfully creates v3
- [ ] Error handling works for invalid inputs
- [ ] MongoDB transactions ensure data consistency

## Database Verification

You can verify the changes directly in MongoDB:

```javascript
// Check KMS keys
db.kmskeys.find({ creatorId: ObjectId("507f1f77bcf86cd799439011") });

// Check assets
db.assets.find({
  creatorId: ObjectId("507f1f77bcf86cd799439011"),
  isEncrypted: true,
});
```

## Screenshot Requirements

For your PR, take screenshots showing:

1. Successful key rotation API response in Postman/Browser
2. GET all keys response showing multiple versions
3. GET active key response showing the new version

## Troubleshooting

### Issue: "MONGODB_URI environment variable is not defined"

**Solution:** Ensure your `.env` file exists and contains the MONGODB_URI

### Issue: "No active KMS key found for user"

**Solution:** Run the seed script again: `pnpm seed:kms`

### Issue: Connection timeout

**Solution:** Check your MongoDB connection string and network connectivity

### Issue: "Cannot find module"

**Solution:** Run `pnpm install` in the backend directory

## Clean Up

To reset the test data:

```javascript
// In MongoDB shell or Compass
db.users.deleteMany({ email: "test@stellarproof.com" });
db.kmskeys.deleteMany({ creatorId: ObjectId("your-test-user-id") });
db.assets.deleteMany({ creatorId: ObjectId("your-test-user-id") });
```

Then run `pnpm seed:kms` again to create fresh test data.
