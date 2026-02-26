# Provenance Minting Implementation

## Overview

This implementation adds automatic provenance certificate minting upon successful content verification in the StellarProof smart contract system.

## Architecture

### Contracts

1. **Provenance Contract** (`contracts/provenance/`)
   - Manages provenance certificates for verified content
   - Stores certificates with content hash, owner, timestamp, and unique ID
   - Provides `mint()` function to create new certificates
   - Provides `get_certificate()` function to retrieve certificates by ID

2. **StellarProof Contract** (`contracts/stellarproof/`)
   - Performs content verification using SHA-256 hashing
   - Automatically calls provenance contract to mint certificates on successful verification
   - Handles cross-contract errors gracefully
   - Returns verification results with certificate ID when minting succeeds

## Key Features

### Content Verification

- Uses SHA-256 cryptographic hashing for content verification
- Compares computed hash with expected hash
- Returns 16-character hex string representation of hash (first 8 bytes)

### Automatic Minting

- Mints provenance certificate only when verification succeeds
- Skips minting when verification fails
- Handles provenance contract errors gracefully without failing verification

### Cross-Contract Communication

- StellarProof contract calls Provenance contract's `mint()` function
- Uses Soroban SDK's contract client for type-safe cross-contract calls
- Implements error handling with Result types

### Error Handling

- Verification failure: Returns success=false, no certificate minted
- Provenance contract not initialized: Verification succeeds, no certificate minted
- Minting error: Verification succeeds, error logged, no certificate minted
- All errors handled gracefully without panicking

## Implementation Details

### StellarProof Contract

```rust
pub fn verify_and_mint(
    env: Env,
    content: String,
    expected_hash: String,
    owner: Address,
) -> VerificationResult
```

**Flow:**

1. Compute SHA-256 hash of content
2. Compare with expected hash
3. If match: Call provenance contract to mint certificate
4. Return result with success status and optional certificate ID

### Provenance Contract

```rust
pub fn mint(
    env: Env,
    content_hash: String,
    owner: Address,
) -> u64
```

**Flow:**

1. Require authorization from owner
2. Increment certificate counter
3. Create and store certificate
4. Emit minting event
5. Return certificate ID

## Testing

### Provenance Contract Tests

- `test_mint_certificate`: Verifies basic minting functionality
- `test_mint_multiple_certificates`: Tests sequential minting with incrementing IDs
- `test_get_nonexistent_certificate`: Tests retrieval of non-existent certificates

### StellarProof Contract Tests

- `test_compute_hash`: Verifies hash computation produces 16-char hex string
- `test_verify_success`: Tests successful verification with correct hash
- `test_verify_failure`: Tests failed verification with incorrect hash
- `test_different_content_different_hash`: Ensures different content produces different hashes
- `test_same_content_same_hash`: Ensures same content produces consistent hashes

## Running Tests

```bash
# Test provenance contract
cd contracts/provenance
cargo test

# Test stellarproof contract
cd contracts/stellarproof
cargo test
```

## Building Contracts

```bash
# Build provenance contract
cd contracts/provenance
cargo build --target wasm32-unknown-unknown --release

# Build stellarproof contract
cd contracts/stellarproof
cargo build --target wasm32-unknown-unknown --release
```

## Deployment

1. Deploy the Provenance contract first
2. Deploy the StellarProof contract
3. Initialize StellarProof with the Provenance contract address:
   ```rust
   stellarproof_client.initialize(&provenance_address);
   ```

## Usage Example

```rust
// Initialize contracts
let provenance_addr = deploy_provenance_contract(&env);
let stellarproof_addr = deploy_stellarproof_contract(&env);

// Initialize stellarproof with provenance address
stellarproof_client.initialize(&provenance_addr);

// Verify content and mint certificate
let content = String::from_str(&env, "my content");
let expected_hash = String::from_str(&env, "a1b2c3d4e5f67890"); // Pre-computed hash

let result = stellarproof_client.verify_and_mint(&content, &expected_hash, &owner);

if result.success && result.certificate_id.is_some() {
    println!("Certificate minted with ID: {}", result.certificate_id.unwrap());
}
```

## Acceptance Criteria Status

- ✅ Certificate minted automatically after successful verification
- ✅ Minting is skipped on failed verification
- ✅ Errors from Provenance contract handled gracefully
- ✅ All tests pass successfully
- ⏳ Test cases on testnet (requires deployment)

## Security Considerations

1. **Authorization**: Provenance contract requires owner authorization for minting
2. **Hash Integrity**: Uses SHA-256 for cryptographic security
3. **Error Isolation**: Cross-contract errors don't break verification logic
4. **Storage**: Certificates stored in contract instance storage

## Future Enhancements

1. Add certificate revocation functionality
2. Implement certificate transfer between owners
3. Add batch verification and minting
4. Implement certificate expiration
5. Add metadata support for certificates
