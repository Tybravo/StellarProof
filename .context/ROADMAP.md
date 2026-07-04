# StellarProof Roadmap

## Current Milestone Progress
**Phase 1 — MVP Creator Workflow**: *In Progress*
- [x] Monorepo setup & basic architecture.
- [x] Backend Layered Architecture (Controllers, Services, Models).
- [x] Web2.5 Authentication flow.
- [x] Manifest generation & deterministic hashing.
- [x] Soroban Smart Contracts (Oracle, Provenance, Registry).
- [x] KMS basic encryption and key rotation.
- [x] Frontend Verification Wizard UI and state management.
- [ ] Replace frontend mocks with actual `@stellar/stellar-sdk` contract calls.
- [ ] Complete KMS asset data re-encryption during key rotation.

## Completed Milestones
**Phase 0 — Architecture Design**
- [x] Manifest schema design.
- [x] Storage abstraction (IPFS/MongoDB).
- [x] Soroban contract schema and architecture.
- [x] KMS and Sealed Provenance Vault (SPV) concept.

## Pending Milestones
**Phase 2 — Developer APIs**
- [ ] SDK release for third-party integrators.
- [ ] Webhooks for verification status updates.
- [ ] API Job management dashboard.

**Phase 3 — Security Hardening**
- [ ] Full AWS Nitro Enclave production deployment.
- [ ] Automated KMS key rotation policies and expiration.
- [ ] Security monitoring and audit logging dashboard.

**Phase 4 — Ecosystem Integration**
- [ ] NFT provenance linking (linking certificates to standard Stellar NFTs).
- [ ] Marketplace verification APIs.
- [ ] Cross-platform SDKs (Python, Go).

**Phase 5 — Governance & Registry**
- [ ] TEE hash governance (DAO or multisig for approving TEE code hashes).
- [ ] Oracle provider staking mechanisms.

## Future Scaling Considerations
- **Storage**: Moving heavy media storage fully to IPFS or Arweave, using MongoDB strictly as a caching/indexing layer.
- **Database**: Sharding MongoDB based on `creatorId` if the SPV record count grows exponentially.
- **Oracle Network**: Decentralizing the Oracle Worker network beyond a single AWS Nitro Enclave to a multi-party computation (MPC) or multi-TEE setup.

## Recommended Implementation Order
1. Finalize Frontend -> Soroban contract integration (remove mocks).
2. Finalize KMS data re-encryption.
3. Deploy Oracle Worker and connect it to the Soroban testnet.
4. Implement Developer APIs (Webhooks & SDK).
5. AWS Nitro Enclave hardening.

## Production-Readiness Checklist
- [ ] All Next.js `useSearchParams` wrapped in `<Suspense>`.
- [ ] E2E testing of the full verification pipeline (Upload -> Encrypt -> Oracle -> Mint).
- [ ] Smart contract security audit.
- [ ] Load testing on the MongoDB transaction logic in `kms.service.ts`.
- [ ] CI/CD pipeline configured for frontend and backend deployments.
- [ ] Secrets management configured (AWS Secrets Manager or Vercel Env Vars) instead of `.env` files.
