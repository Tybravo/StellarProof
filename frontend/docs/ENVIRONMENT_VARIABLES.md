
# Frontend Environment Variables

This document describes the environment variables used by the StellarProof frontend, including their purposes, example values, and configuration requirements.

## 1. Environment File Setup

The frontend provides an example environment file:

```text
frontend/.env.example
```

Create a local environment configuration:

```bash
cp frontend/.env.example frontend/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
```

Next.js automatically loads supported environment files from the frontend application directory.

Do not commit `.env.local` or other files containing private credentials.

## 2. Environment Variable Reference

The following table documents the variables declared in `.env.example` and additional variables referenced by the frontend source code.

### 2.1 Backend API Configuration

| Variable | Example | Required? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Required for backend-dependent features | Defines the base URL of the StellarProof backend API. Used by frontend features that communicate with backend endpoints. |

### 2.2 Stellar Network Configuration

| Variable | Example | Required? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` | Optional | Specifies the expected Stellar network. Supported values are `mainnet`, `testnet`, and `futurenet`. Defaults to `testnet` when unset or invalid. |
| `NEXT_PUBLIC_NETWORK_BYPASS` | `false` | Optional | Controls whether the wrong-network warning is bypassed. Set to `true` to suppress the warning. |
| `NEXT_PUBLIC_VITE_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Optional in the example configuration | Defines the Horizon endpoint intended for Stellar network access. |
| `NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Optional in the example configuration | Defines the Stellar network passphrase used by network and transaction configuration. |

### 2.3 Soroban Configuration

| Variable | Example | Required? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID` | `YOUR_SOROBAN_CONTRACT_ID` | Required for the corresponding contract interactions | Identifies the Soroban provenance contract used by contract-dependent frontend functionality. |
| `NEXT_PUBLIC_VITE_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Required for the corresponding RPC interactions | Defines the Soroban RPC endpoint. |
| `NEXT_PUBLIC_VITE_GOVERNANCE_CONTRACT_ID` | `YOUR_GOVERNANCE_CONTRACT_ID` | Required for governance contract interactions | Identifies the governance contract used by the governance voting interface. |
| `NEXT_PUBLIC_VITE_REGISTRY_CONTRACT_ID` | `YOUR_REGISTRY_CONTRACT_ID` | Required for registry contract interactions | Identifies the registry contract used by Oracle staking and collateral functionality. |

### 2.4 Wallet Development Configuration

| Variable | Example | Required? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_MOCK_WALLET` | `false` | Optional | Enables mock wallet behavior when set to `true`. Used by wallet and Horizon-related frontend services to support local development and testing without relying on a real wallet connection. |

## 3. Example Environment Configuration

The following is a complete example containing the documented configuration variables.

```dotenv
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000

# Stellar network
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_NETWORK_BYPASS=false

# Horizon and network configuration
NEXT_PUBLIC_VITE_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_VITE_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Soroban configuration
NEXT_PUBLIC_VITE_SOROBAN_CONTRACT_ID=
NEXT_PUBLIC_VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Governance configuration
NEXT_PUBLIC_VITE_GOVERNANCE_CONTRACT_ID=

# Registry configuration
NEXT_PUBLIC_VITE_REGISTRY_CONTRACT_ID=

# Wallet development configuration
NEXT_PUBLIC_MOCK_WALLET=false
```

Replace empty contract ID values with the deployed contract IDs required by the features you intend to test.

The values above are development examples, not production credentials.

## 4. Required and Optional Configuration

Not every frontend feature requires every environment variable.

### Backend-dependent functionality

Configure `NEXT_PUBLIC_API_URL` when using functionality that communicates with the StellarProof backend.

### Stellar network functionality

`NEXT_PUBLIC_STELLAR_NETWORK` is optional because the frontend network configuration defaults to Testnet.

For production deployments, explicitly configure the intended network.

### Soroban contract functionality

Configure the appropriate contract ID and RPC endpoint when interacting with the corresponding Soroban contracts.

For example:

- Verification and provenance functionality requires the relevant provenance contract configuration.
- Governance functionality requires the governance contract ID.
- Registry staking functionality requires the registry contract ID.

### Mock wallet functionality

`NEXT_PUBLIC_MOCK_WALLET` is optional.

Use `true` only when intentionally testing mock wallet behavior. Set it to `false` or omit it when using a real wallet.

### Network warning bypass

`NEXT_PUBLIC_NETWORK_BYPASS` is optional and defaults to disabled when unset.

Avoid enabling it in environments where network mismatch warnings are important.

## 5. Important Security Considerations

Next.js exposes environment variables prefixed with `NEXT_PUBLIC_` to browser-side application code.

Therefore:

- Never store private keys in frontend environment variables.
- Never expose wallet secrets or seed phrases.
- Never place backend API secrets in `NEXT_PUBLIC_` variables.
- Never expose database credentials, private signing keys, or confidential service tokens.
- Keep sensitive configuration on the backend.
- Use `.env.local` for local development.
- Configure deployment environment variables through the deployment platform's secure settings.

The `NEXT_PUBLIC_VITE_` prefix used by some existing configuration variables does not make those variables private. They still begin with `NEXT_PUBLIC_` and must be treated as browser-exposed values.

## 6. Environment Variable Maintenance

When introducing a new frontend environment variable:

1. Add the variable to `frontend/.env.example`.
2. Provide a meaningful description in the example file.
3. Document its purpose in this reference.
4. Specify whether it is required or optional.
5. Provide a safe example value.
6. Never add actual secrets or production credentials.
7. Ensure the implementation handles missing optional values safely.

## 7. Related Documentation

- [Getting Started](./GETTING_STARTED.md)
- [Project Directory Structure](./DIRECTORY_STRUCTURE.md)
- [Next.js App Router Structure](./APP_ROUTER.md)
