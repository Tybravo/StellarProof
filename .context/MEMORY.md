# StellarProof Project Memory

## Project Overview
- **Project Purpose**: StellarProof is a decentralized digital content verification and provenance platform built on the Stellar blockchain. It provides verifiable, auditable provenance for digital media and metadata.
- **Business/Domain Goal**: Transform the Stellar network into a "truth engine" for digital media, providing Proof-as-a-Service APIs to verify content origin, integrity, and authenticity. Prevent media manipulation, forgery, and deepfakes.
- **Target Users**: Creators, developers, and platforms that need to generate immutable authenticity proofs for digital media.

## Tech Stack
- **Frontend Technologies**: Next.js (App Router), TypeScript, Tailwind CSS, Zustand (for wizard state), React Context (Auth, Wallet, Theme).
- **Backend Technologies**: Node.js, Express, TypeScript, MongoDB.
- **Databases**: MongoDB (for fast metadata queries, user data, SPV records, and KMS keys).
- **Storage Layer**: IPFS (decentralized) or MongoDB (high performance) / Cloudinary.
- **Blockchain/Web3 Integrations**: Stellar Network, Soroban Smart Contracts (Rust), Freighter Wallet, `@stellar/stellar-sdk`.
- **Trusted Compute (TEE)**: AWS Nitro Enclave (Oracle worker node).
- **Testing Tools**: Jest.
- **Package Managers**: pnpm (Monorepo setup using `pnpm-workspace.yaml`).

## System Architecture
- **High-Level Explanation**: StellarProof combines Web2 infrastructure (for speed and storage) with Web3 trust guarantees (for immutability and verification). Media and JSON manifests are uploaded, optionally encrypted via a Key Management Service (KMS), and stored. A verification request is sent to a Soroban Oracle contract. An off-chain Oracle Worker running in a Trusted Execution Environment (TEE) like AWS Nitro Enclaves performs the verification, generates an attestation, and signs it. The Soroban contract verifies this attestation and mints a Provenance Certificate.
- **Communication Flow**:
  1. Frontend -> Backend: REST API calls for upload, manifest creation, KMS encryption, and status checks.
  2. Backend -> Storage: Uploads media to IPFS/MongoDB/Cloudinary.
  3. Frontend -> Soroban: Submits verification requests using connected wallet (Freighter).
  4. Soroban -> Oracle Worker: Emits events / state changes.
  5. Oracle Worker -> TEE -> Soroban: Fetches files, verifies, signs attestation, submits to Soroban.
  6. Soroban Oracle -> Soroban Provenance: Mints certificate upon successful attestation.
- **Modular Boundaries**: Strict separation between on-chain state (immutable logs, signatures, final certificates) and off-chain execution (file storage, encryption, heavy computation).

## Current Implementation Status
- **Completed Systems**: 
  - Monorepo setup with pnpm.
  - Backend Layered Architecture (Controllers, Services, Models, Routes).
  - Web2.5 Authentication flow (Email/Password + Stellar Wallet).
  - KMS Key Rotation and encryption/decryption logic (AES-256-GCM).
  - Manifest generation and deterministic hashing.
  - Smart Contracts (Oracle, Provenance, Registry) implemented in Rust.
  - Frontend Verification Wizard using Zustand.
- **Partially Completed Systems**:
  - Oracle Worker / TEE integration (currently mocked/simulated in frontend).
  - Actual asset data re-encryption in KMS (currently only metadata/mocked).
- **Missing Systems**: 
  - Complete AWS Nitro Enclave production deployment.
  - Real-time webhook notifications for verification completion.

## Folder Structure Analysis
- `frontend/`: Next.js application. `app/` contains routing, `components/` for reusable UI, `features/` for domain-specific logic (e.g., verification wizard), `context/` for global state.
- `backend/`: Express server. `src/controllers/` (HTTP handlers), `src/services/` (business logic), `src/models/` (Mongoose schemas), `src/routes/` (API routing, versioned as `/api/v1/`).
- `contracts/`: Soroban smart contracts. `oracle/` (handles verification logic), `provenance/` (mints certificates), `registry/` (manages trusted TEEs).
- `oracle-worker/`: Orchestrates the TEE verification (architecture documented, code may be external or pending full implementation).

## Backend Architecture
- **Controllers**: Handle HTTP requests, extract parameters, call services, and return responses. No business logic.
- **Services**: Contain all core business logic (e.g., `kms.service.ts`, `manifest.service.ts`). Use MongoDB transactions for atomicity.
- **Repositories**: Mongoose models (`Manifest.model.ts`, `KMSKey.model.ts`, `SPVRecord.model.ts`) act as the data layer. Use pre-save hooks (e.g., deterministic hashing).
- **Middleware**: Rate limiting (`authRateLimiter`, `apiV1RateLimiter`), CORS, Helmet, Global Error Handler, JWT Auth, API Key validation, Zod validation.
- **Auth Flow**: Web2.5 model. Users sign up with email/password, receive a JWT token, and later link their Stellar wallet (`stellarPublicKey`).
- **Validation Flow**: Handled at the router level using Zod schemas and validation middleware.
- **API Patterns**: Versioned (`/api/v1/...`), standard JSON response format (`{ success: true, data: ... }` or `{ success: false, error: ... }`).

## Frontend Architecture
- **Routing**: Next.js App Router (`app/`). Protected routes handle auth gating.
- **State Management**: Zustand for complex, multi-step features (`features/verification/store/wizard.store.ts`). React Context for global UI state (Theme, Toast, Wallet, Auth).
- **Reusable UI Structure**: Component-driven. `components/ui/` for basic building blocks (Buttons, Modals, Accordions).
- **API Integration Strategy**: Axios or native `fetch` via custom hooks, optionally wrapped with React Query (indicated by `QueryProvider`).
- **Page/Component Organization**: Features are modularized. E.g., `features/verification` contains components, hooks, store, and types for the verification flow.

## Database Design
- **Schema Overview**: MongoDB schemas for User, Manifest, Asset, VerificationJob, Certificate, KMSKey, SPVRecord.
- **Important Relationships**: `creatorId` links documents back to the User model.
- **Entity Responsibilities**: 
  - `Manifest`: Stores metadata and content hashes.
  - `KMSKey`: Manages encryption keys, versions, and auth tags.
  - `SPVRecord`: Sealed Provenance Vault record, handles encrypted payloads.

## Authentication & Authorization
- **Auth Mechanism**: JWT-based authentication for Web2 login.
- **Session/Token Flow**: Token passed in headers. `auth.middleware.ts` verifies JWT and injects `req.user`.
- **Roles and Permissions**: Web2.5 progressive auth. Certain features (like connecting a wallet) require prior Web2 authentication.

## Smart Contract / Blockchain Section
- **Contract Architecture**: Modular Soroban contracts (Registry, Oracle, Provenance).
- **Wallet Interactions**: Frontend uses Freighter wallet to sign transactions.
- **On-chain/Off-chain Relationship**: Heavy storage and computation are off-chain. On-chain only stores hashes, verification states, and final certificates.
- **Event Flow**: Frontend submits request -> Oracle creates Pending state -> Off-chain worker detects request -> worker verifies -> worker submits attestation -> Oracle verifies attestation -> calls Provenance to mint.

## Environment Configuration
- `PORT`, `NODE_ENV`, `LOG_LEVEL`
- `MONGODB_URI`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `MASTER_KEY` (KMS encryption)
- `CLOUDINARY_URL` / API keys
- `STELLAR_NETWORK_PASSPHRASE`, `SOROBAN_RPC_URL`

## Development Conventions
- **Naming Conventions**: `camelCase` for variables/functions, `PascalCase` for classes/components/models. File names often follow `feature.type.ts` (e.g., `kms.service.ts`).
- **Folder Conventions**: Strict layered architecture in the backend (`controllers/`, `services/`, `models/`, `routes/`).
- **File Organization**: Grouped by technical concern in backend, feature-based in frontend.
- **API Response Patterns**: Consistent wrapper with `success`, `data`, `message`, `error` fields.
- **Error Handling Style**: Custom `AppError` class. Handled via `next(error)` in controllers, caught by `globalErrorHandler` middleware. HTTP Status codes used correctly.
- **Testing Style**: Jest for unit and integration testing. `*.test.ts` alongside implementation or in `__tests__/` folders.

## Known Issues
- Actual asset data re-encryption in KMS is pending (currently metadata only).
- TEE Verification in frontend is currently mocked/simulated with timeouts and hardcoded data.
- Handling of `useSearchParams` needs strict `<Suspense>` wrapping (Next.js build issue noted in user memories).

## Technical Debt
- Replace mock implementations in `frontend/services/verificationService.ts` with actual Soroban contract invocations using `@stellar/stellar-sdk`.
- Implement actual file re-encryption during KMS key rotation, instead of just rotating the keys.
- Ensure Swagger documentation is strictly adhered to for payload matching (as per user memory).

## AI Agent Instructions
- **What to preserve**: The strict layered architecture in the backend. Do not mix business logic into controllers. Keep on-chain footprint minimal (only hashes/state).
- **What to avoid changing**: The Web2.5 auth flow structure. The deterministic hashing logic in the Manifest model.
- **Architectural Rules**:
  - Always use `generateDeterministicHash` for manifests.
  - Wrap `useSearchParams` in Next.js with `<Suspense>`.
  - Always strictly adhere to the Swagger documentation for endpoints and payloads.
  - When getting a 400 Bad Request, consult Swagger docs for payload mismatches.
- **Coding Expectations**: Use TypeScript strongly typed interfaces (avoid `any`). Use `StatusCodes` enum for HTTP responses.
- **Implementation Patterns**: Use MongoDB sessions and transactions for multi-document updates (e.g., KMS key rotation).

## Recent Project Direction
- Recent commits/files indicate a focus on KMS Key Rotation implementation and the Frontend Verification Wizard.
- Work is progressing towards linking the Web2 storage/KMS layer with the Web3 verification/minting layer.
- Moving from mocked verification to real TEE and Soroban integration.

## Recommended Next Steps
1. Replace mock Soroban submissions in frontend with actual `@stellar/stellar-sdk` transactions.
2. Implement actual file data re-encryption in `kms.service.ts`.
3. Complete the Oracle Worker orchestration logic for AWS Nitro Enclaves.
4. Add comprehensive E2E tests for the full verification pipeline.
