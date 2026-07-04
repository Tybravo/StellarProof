# StellarProof Project Handoff

## What was recently being worked on
- Implementation of the KMS Key Rotation feature in the backend (`kms.service.ts`, `kms.controller.ts`, `kms.routes.ts`, `KMSKey.model.ts`).
- Structuring the frontend Verification Wizard using Zustand (`wizard.store.ts`).
- The backend architecture has been stabilized with a strict Controller-Service-Model pattern.

## Unfinished Tasks
- **KMS Asset Re-encryption**: The key rotation logic rotates the keys successfully, but the actual asset data re-encryption (payloads) is marked as a TODO in the implementation summary.
- **Frontend Contract Integration**: The `submitVerificationRequest` in `frontend/services/verificationService.ts` is currently using a mock implementation. It needs to be wired up to the Soroban smart contracts using `@stellar/stellar-sdk`.
- **Oracle Worker**: Full integration with the AWS Nitro Enclave and Soroban contracts for off-chain verification.

## Blockers
- No hard blockers identified, but the transition from mocked contract calls to actual Soroban RPC calls requires a deployed contract on Testnet/Mainnet and proper environment variables (`CONTRACT_ID`, `SOROBAN_RPC_URL`).

## Next Immediate Steps
1. **Frontend**: Update `submitVerificationRequest` to construct and submit an actual Soroban transaction.
2. **Backend (KMS)**: Complete the `// TODO: Implement actual asset data re-encryption` in `kms.service.ts` for when keys are rotated.
3. **Integration**: Test the full flow from uploading a manifest to minting a certificate on the Stellar testnet.

## Files likely needing modification next
- `frontend/services/verificationService.ts` (to remove mocks)
- `backend/src/services/kms.service.ts` (to implement full asset re-encryption)
- `backend/src/controllers/verification.controller.ts` (to handle real webhook callbacks from the Oracle worker)

## Important Warnings Before Continuing Development
- **Next.js `useSearchParams`**: Any new usage of `useSearchParams()` in the frontend must be wrapped in a `<Suspense>` boundary to prevent production build failures.
- **Swagger Strictness**: Always refer to the provided Swagger documentation for exact endpoint URLs and payload property names. Do not assume standard naming conventions. If you get a 400 Bad Request, check the payload against Swagger.
- **Transaction Atomicity**: Ensure any new multi-document MongoDB operations use `mongoose.startSession()` and `session.startTransaction()`.
- **Environment Variables**: Do not expose `MASTER_KEY` or `JWT_SECRET`.
