# Provenance Contract Deployment Guide

## Prerequisites

1. **Install Stellar CLI**

   ```bash
   cargo install --locked stellar-cli --features opt
   ```

2. **Verify Installation**
   ```bash
   stellar --version
   ```

## Quick Deployment

Run the automated deployment script:

```bash
cd contracts/provenance
./deploy.sh
```

The script will:

1. Build the contract for WASM target
2. Create/use a deployer identity
3. Fund the identity from testnet friendbot
4. Deploy the contract to testnet
5. Initialize the contract with an oracle address
6. Run a test mint operation
7. Verify the minted certificate

## Manual Deployment

If you prefer to deploy manually:

### 1. Build the Contract

```bash
cargo build --release --target wasm32-unknown-unknown
```

### 2. Setup Identity

```bash
# Generate a new identity
stellar keys generate --global my-identity --network testnet

# Fund it from friendbot
stellar keys fund my-identity --network testnet
```

### 3. Deploy Contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/provenance.wasm \
  --source my-identity \
  --network testnet
```

Save the returned contract ID.

### 4. Initialize Contract

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source my-identity \
  --network testnet \
  -- initialize \
  --oracle <ORACLE_ADDRESS>
```

### 5. Test Minting

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source my-identity \
  --network testnet \
  -- mint \
  --to <RECIPIENT_ADDRESS> \
  --details '{"content_hash":"your_hash","metadata":"your_metadata"}'
```

### 6. Get Certificate

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source my-identity \
  --network testnet \
  -- get_certificate \
  --certificate_id 1
```

## Contract Functions

### initialize(oracle: Address)

Initializes the contract with the authorized oracle address. Can only be called once.

### mint(to: Address, details: CertificateDetails) -> u64

Mints a new certificate. Only callable by the oracle address. Returns the certificate ID.

**CertificateDetails structure:**

```json
{
  "content_hash": "string",
  "metadata": "string"
}
```

### get_certificate(certificate_id: u64) -> Option<Certificate>

Retrieves a certificate by ID.

## Troubleshooting

### "stellar: command not found"

Install the Stellar CLI:

```bash
cargo install --locked stellar-cli --features opt
```

### "insufficient balance"

Fund your identity:

```bash
stellar keys fund <identity-name> --network testnet
```

### "Contract already initialized"

The contract can only be initialized once. If you need to reinitialize, deploy a new instance.

## Network Configuration

The deployment script uses Stellar testnet by default:

- RPC URL: https://soroban-testnet.stellar.org:443
- Network Passphrase: "Test SDF Network ; September 2015"

## Security Notes

⚠️ **Important**: The deployment script uses the deployer address as the oracle for testing purposes. In production:

1. Deploy the Oracle contract first
2. Use the Oracle contract's address when initializing the Provenance contract
3. Never use personal addresses as the oracle in production
