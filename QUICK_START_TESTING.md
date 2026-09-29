# Quick Start Testing Guide - TEE Config Feature

## 5-Minute Setup

### 1. Prepare Environment
```bash
cd backend
cp .env.example .env
# Edit .env and add your MONGODB_URI and JWT_SECRET
```

### 2. Start Backend
```bash
pnpm dev
# Expected output:
# Server is running on port 4000
# MongoDB Connected: <your-cluster>
```

### 3. Open Postman
- Create a new collection called "TEE Config"
- Import the following requests

---

## Test Requests (Copy & Paste)

### 1. Create TEE Configuration
**POST** `http://localhost:4000/api/v1/tee-config/create`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "tee-testnet-v1",
  "description": "Test TEE configuration for testnet",
  "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "workerBinaryHash": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "enclaveBinaryHash": "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
  "version": "1.0.0",
  "environment": "testnet"
}
```

**Expected Response: 201 Created**
```json
{
  "success": true,
  "message": "TEE configuration created successfully",
  "data": {
    "id": "xxxxx",
    "name": "tee-testnet-v1",
    "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "version": "1.0.0",
    "environment": "testnet",
    "isActive": true,
    "isDeprecated": false,
    "createdAt": "2024-09-28T10:00:00.000Z",
    "updatedAt": "2024-09-28T10:00:00.000Z"
  }
}
```

**Verification:**
- ✅ Response status: 201
- ✅ `success`: true
- ✅ `data.isActive`: true
- ✅ Save the `id` for next tests

---

### 2. Get Active Configuration
**GET** `http://localhost:4000/api/v1/tee-config/active/testnet`

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Active TEE configuration retrieved successfully",
  "data": {
    "id": "xxxxx",
    "name": "tee-testnet-v1",
    "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "version": "1.0.0",
    "environment": "testnet",
    "isActive": true,
    "isDeprecated": false
  }
}
```

**Verification:**
- ✅ Returns the config you just created
- ✅ `isActive`: true

---

### 3. Get by Code Measurement Hash
**GET** `http://localhost:4000/api/v1/tee-config/hash/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

**Expected Response: 200 OK**
Same config as above

**Verification:**
- ✅ Hash-based lookup works
- ✅ Returns correct configuration

---

### 4. Get by ID
**GET** `http://localhost:4000/api/v1/tee-config/{id}`

(Replace `{id}` with the ID from step 1)

**Expected Response: 200 OK**
Same config as above

**Verification:**
- ✅ Direct ID lookup works

---

### 5. List All Configurations
**GET** `http://localhost:4000/api/v1/tee-config`

**Optional Query Parameters:**
```
?environment=testnet
?isActive=true
?isDeprecated=false
?environment=testnet&isActive=true
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Retrieved 1 TEE configurations",
  "data": [
    {
      "id": "xxxxx",
      "name": "tee-testnet-v1",
      "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "version": "1.0.0",
      "environment": "testnet",
      "isActive": true,
      "isDeprecated": false
    }
  ]
}
```

**Verification:**
- ✅ Returns array of configurations
- ✅ Filtering works with query params

---

### 6. Login (For Protected Endpoints)
**POST** `http://localhost:4000/api/v1/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "xxxxx",
      "email": "user@example.com",
      "role": "creator"
    }
  }
}
```

**Important:**
- ✅ Save the `token` value
- Use in Authorization header for protected endpoints

---

### 7. Update Configuration (Protected)
**PATCH** `http://localhost:4000/api/v1/tee-config/{id}`

(Replace `{id}` with the ID from step 1)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

(Replace `{token}` with the token from step 6)

**Body:**
```json
{
  "description": "Updated description",
  "version": "1.0.1"
}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "TEE configuration updated successfully",
  "data": {
    "id": "xxxxx",
    "name": "tee-testnet-v1",
    "description": "Updated description",
    "version": "1.0.1",
    "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "environment": "testnet",
    "isActive": true,
    "isDeprecated": false
  }
}
```

**Verification:**
- ✅ Requires valid JWT token
- ✅ Fields updated correctly
- ✅ `updatedAt` timestamp changed

---

### 8. Deprecate Configuration (Protected)
**POST** `http://localhost:4000/api/v1/tee-config/{id}/deprecate`

**Headers:**
```
Authorization: Bearer {token}
```

**Expected Response: 200 OK**
```json
{
  "success": true,
  "message": "TEE configuration deprecated successfully",
  "data": {
    "id": "xxxxx",
    "name": "tee-testnet-v1",
    "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "version": "1.0.1",
    "environment": "testnet",
    "isActive": false,
    "isDeprecated": true,
    "deprecatedAt": "2024-09-28T10:05:00.000Z"
  }
}
```

**Verification:**
- ✅ `isDeprecated`: true
- ✅ `isActive`: false (automatically set)
- ✅ `deprecatedAt` timestamp set

---

### 9. Create Second Config (For Comparison)
**POST** `http://localhost:4000/api/v1/tee-config/create`

**Body:**
```json
{
  "name": "tee-mainnet-v1",
  "description": "Mainnet TEE configuration",
  "codeMeasurementHash": "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  "version": "1.0.0",
  "environment": "mainnet"
}
```

**Expected Response: 201 Created**

**Verification:**
- ✅ New config created with different environment
- ✅ Different hash
- ✅ Can now test environment filtering

---

### 10. List with Filter (Testnet Only)
**GET** `http://localhost:4000/api/v1/tee-config?environment=testnet&isActive=false`

**Expected Response: 200 OK**
Returns the deprecated testnet config from step 8

**Verification:**
- ✅ Filtering works correctly
- ✅ Returns only matching configurations

---

## Database Verification

### 1. Open MongoDB Atlas

### 2. Navigate to Collections
Database: `stellarproof` → Collection: `teeconfigs`

### 3. Verify Documents
Should see 2 documents:
- `tee-testnet-v1` (deprecated)
- `tee-mainnet-v1` (active)

### 4. Check Fields
Each document should have:
- ✅ `_id`: ObjectId
- ✅ `name`: String
- ✅ `codeMeasurementHash`: SHA-256 hex string
- ✅ `version`: String
- ✅ `environment`: Enum value
- ✅ `isActive`: Boolean
- ✅ `isDeprecated`: Boolean
- ✅ `createdAt`, `updatedAt`: Dates
- ✅ `activatedAt`, `deprecatedAt`: Dates

### 5. Verify Indexes
Go to Indexes tab:
- ✅ `name_1` (unique)
- ✅ `codeMeasurementHash_1` (unique)
- ✅ `environment_1`
- ✅ Compound indexes

---

## Error Testing (Optional)

### 1. Invalid Hash Format
**POST** `http://localhost:4000/api/v1/tee-config/create`

**Body** (invalid hash - too short):
```json
{
  "name": "test-invalid",
  "codeMeasurementHash": "invalid123",
  "version": "1.0.0",
  "environment": "testnet"
}
```

**Expected: 400 Bad Request**
```json
{
  "success": false,
  "error": "Code measurement hash must be a valid SHA-256 hex string (64 characters)",
  "code": "INVALID_HASH_FORMAT"
}
```

### 2. Duplicate Hash
**POST** `http://localhost:4000/api/v1/tee-config/create`

**Body** (use hash from first config):
```json
{
  "name": "test-duplicate",
  "codeMeasurementHash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "version": "1.0.0",
  "environment": "testnet"
}
```

**Expected: 409 Conflict**
```json
{
  "success": false,
  "error": "A TEE config with this code measurement hash already exists: tee-testnet-v1",
  "code": "HASH_EXISTS"
}
```

### 3. Invalid Environment
**POST** `http://localhost:4000/api/v1/tee-config/create`

**Body** (invalid environment):
```json
{
  "name": "test-invalid-env",
  "codeMeasurementHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "version": "1.0.0",
  "environment": "invalid"
}
```

**Expected: 400 Bad Request**
Zod validation error

### 4. Missing Required Fields
**POST** `http://localhost:4000/api/v1/tee-config/create`

**Body** (missing codeMeasurementHash):
```json
{
  "name": "test-missing",
  "version": "1.0.0",
  "environment": "testnet"
}
```

**Expected: 400 Bad Request**

---

## Success Checklist

After running all tests:

- [ ] All 10 successful requests returned expected responses
- [ ] All status codes were correct (201, 200, 200, etc.)
- [ ] MongoDB documents created and visible in collection
- [ ] Data persisted correctly (no mock values)
- [ ] Filtering worked with query parameters
- [ ] JWT authentication worked for protected endpoints
- [ ] Updates reflected in database
- [ ] Deprecation status changed correctly
- [ ] Error handling returned appropriate responses
- [ ] All fields present in responses

---

## Screenshots to Capture

For PR proof of work, take screenshots of:

1. **Create Config** - Postman response showing 201
2. **Get Active** - Postman response showing retrieval
3. **Get by Hash** - Postman response showing lookup
4. **List Configs** - Postman response showing filtered array
5. **Update Config** - Postman response showing updated fields
6. **Deprecate Config** - Postman response showing deprecation
7. **MongoDB Collection** - Shows documents in `teeconfigs` collection
8. **MongoDB Indexes** - Shows index configuration

---

## Troubleshooting

### Backend won't start
- Check `.env` has `MONGODB_URI` and `JWT_SECRET`
- Ensure port 4000 is available
- Check MongoDB connection string is valid

### 401 Unauthorized on protected endpoints
- Make sure you're including the JWT token in Authorization header
- Token format: `Bearer {token}` (with space)
- Token may have expired (get a new one)

### 404 Not Found on GET requests
- Check the ID is correct (copy from create response)
- Ensure it's a valid MongoDB ObjectId format
- Verify config exists in MongoDB

### Hash validation errors
- Hash must be exactly 64 hex characters
- Only lowercase `a-f` and `0-9` allowed
- Cannot have spaces or special characters

---

## Next Steps

1. ✅ Run all 10 tests
2. ✅ Capture 8 screenshots
3. ✅ Verify MongoDB persistence
4. ✅ Create PR with screenshots attached
5. ✅ Reference PR_CHECKLIST.md for PR template

**Estimated time**: 5-10 minutes for full testing
