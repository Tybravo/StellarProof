# StellarProof Technical Architecture

## System Boundaries
StellarProof operates across three primary boundaries:
1. **Client Boundary (Frontend)**: Next.js application running in the user's browser. Handles UI, wallet connections (Freighter), form state (Zustand), and direct interactions with the Stellar network for signing transactions.
2. **Server Boundary (Backend & Off-Chain Worker)**: Node.js Express server and Oracle Worker. Manages Web2 authentication, database operations, media storage, KMS encryption, and orchestrating TEE verification.
3. **Blockchain Boundary (Soroban)**: Rust smart contracts deployed on the Stellar network. Acts as the immutable source of truth, storing verification states, validating cryptographic signatures, and minting certificates.

## Module Relationships
- **Frontend** <-> **Backend**: REST API over HTTPS. Frontend authenticates via JWT and requests data/actions (upload, encrypt).
- **Frontend** <-> **Soroban**: RPC via `@stellar/stellar-sdk`. Frontend submits transactions (e.g., `submit_request`) signed by the user's Freighter wallet.
- **Backend (KMS)** <-> **MongoDB**: Encrypts/decrypts assets. Uses transactions for key rotation.
- **Oracle Worker** <-> **Soroban**: Reads pending requests from the blockchain, performs verification, and submits signed attestations.
- **Soroban Oracle Contract** <-> **Soroban Provenance Contract**: Cross-contract calls. Oracle verifies the TEE attestation and authorizes Provenance to mint the certificate.

## Request Lifecycle (Verification Pipeline)
1. **Initialization**: User authenticates (Web2.5) and creates a Manifest payload in the Frontend.
2. **Upload & Encrypt**: Frontend sends Media + Manifest to Backend. Backend optionally encrypts media using KMS (AES-256-GCM), generates a deterministic hash of the Manifest, and stores the data (IPFS/MongoDB). Backend returns `storageId` and `manifestHash`.
3. **On-Chain Request**: Frontend prompts user to sign a `submit_request(contentHash)` transaction to the Soroban Oracle Contract.
4. **Oracle Execution**: Off-chain Oracle Worker detects the new request. It fetches the encrypted payload and manifest from the Backend/Storage, decrypts it inside the TEE (AWS Nitro Enclave), and performs verification (matching hashes, metadata checks).
5. **Attestation**: TEE generates an attestation report, signs it with an Ed25519 key, and the Oracle Worker submits `verify_attestation` to the Soroban Oracle Contract.
6. **Minting**: Oracle Contract verifies the signature and TEE hash against the Registry Contract. If valid, it invokes the Provenance Contract's `mint` function.
7. **Completion**: Provenance Contract mints the Certificate. Frontend detects the state change and displays the certificate.

## Data Flow
- **Media**: Client -> Backend -> Storage (IPFS/Cloudinary). Heavy payloads never touch the blockchain.
- **Manifest**: Client -> Backend (Hashed) -> Database. The `manifestHash` is passed to the blockchain.
- **Keys**: KMS generates symmetric keys, encrypts them with a `MASTER_KEY`, and stores them in MongoDB. Symmetric keys are decrypted in memory during operations.
- **Hashes & Signatures**: TEE generates execution hashes and signs them. These small payloads are sent to Soroban for verification.

## Infrastructure Assumptions
- **Storage**: IPFS provides permanent, decentralized storage, but MongoDB/Cloudinary is used for speed/MVP.
- **Compute**: Verification requires significant compute (hashing large video files, AI model checks). This must be done off-chain in a TEE, not on-chain.
- **Trust**: The system trusts the AWS Nitro Enclave attestation document. The Soroban Registry Contract acts as the root of trust for which TEE code hashes are valid.

## Scaling Considerations
- **Database Transactions**: KMS key rotation uses MongoDB transactions. This requires a replica set in MongoDB (standard in MongoDB Atlas).
- **Oracle Worker Concurrency**: The Oracle Worker must be stateless and capable of horizontal scaling to handle multiple verification requests concurrently.
- **API Rate Limiting**: Implemented in the backend (`apiV1RateLimiter`, `authRateLimiter`) to prevent DDoS and abuse of the KMS/Storage APIs.

## External Integrations
- **Stellar Network**: Soroban smart contracts, Freighter wallet.
- **AWS Nitro Enclaves**: Trusted Execution Environment.
- **IPFS / Cloudinary**: Decentralized and centralized media storage.
- **MongoDB Atlas**: Primary database.

## Design Patterns Used
- **Layered Architecture (Backend)**: Strict Controller -> Service -> Model separation.
- **Deterministic Hashing**: Mongoose pre-save hooks ensure identical manifest payloads always result in the same hash.
- **Web2.5 Auth**: Progressive authentication. Users start with familiar Web2 (email) and progressively opt-in to Web3 (Stellar wallet).
- **Zustand State Machine**: Frontend wizard uses a centralized store with persistence (`wizard-storage`) to handle complex multi-step forms.
- **Cross-Contract Authorization**: Soroban contracts use `require_auth()` and specific admin/oracle addresses to restrict sensitive functions (e.g., `mint` can only be called by the Oracle).
