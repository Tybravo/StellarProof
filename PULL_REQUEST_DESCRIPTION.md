Closes #725

## What was done

- Added integration test at `backend/src/services/__tests__/attestationMint.integration.test.ts` covering the full `verify_attestation` → `buildMint` → `submit` → `confirm` pipeline using `mongodb-memory-server` and injected soroban/SPV mocks.

- 10 tests covering:
  * **Happy path:** finality gate, TEE field persistence, content hash recording, multi-event batch
  * **Failure path:** on-chain tx failure, SPV rejection, simulation error, retryable submission error
  * **Idempotency:** crash recovery from MINTING state, duplicate-completed-job guard

- Added missing types to `backend/src/types/soroban.types.ts`:
  * `TransactionFailureDiagnostics`
  * `SuccessfulTransactionStatus`

  (required by `verificationWorker.ts` and the existing unit test — both imported these types but the definitions were absent)

- Added missing oracle/worker env fields to `backend/src/config/env.ts`:
  * `STELLAR_ORACLE_SECRET_KEY`
  * `STELLAR_PROVENANCE_CONTRACT_ID`
  * `ORACLE_CODE_MEASUREMENT_HASH`
  * `STELLAR_TX_CONFIRMATION_TIMEOUT_MS`
  * `STELLAR_TX_POLL_INTERVAL_MS`
  * `STELLAR_TX_MAX_CONSECUTIVE_RPC_ERRORS`
  * `SPV_FETCH_TIMEOUT_MS`
  * `SPV_MAX_MEDIA_BYTES`
  * `SPV_MAX_MANIFEST_BYTES`
  * `VERIFICATION_WORKER_POLL_INTERVAL_MS`
  * `VERIFICATION_WORKER_BATCH_SIZE`
  * `VERIFICATION_WORKER_MAX_ATTEMPTS`
  * `VERIFICATION_WORKER_RETRY_BASE_MS`
  * `VERIFICATION_WORKER_LEASE_MS`

  (all referenced by `oracle.ts` via `Pick<typeof env, ...>` but missing from the `env` object)

- Added `buildMintTransaction`, `submitTransaction`, and `getTransactionWithConfirmation` methods to `SorobanService` (`backend/src/services/soroban.service.ts`), which were declared in the worker deps as `Pick<SorobanService, ...>` but previously unimplemented on the class.

## Test results

All 10 integration tests pass. The existing 30 `verificationWorker` unit tests also pass.

```
PASS src/services/__tests__/attestationMint.integration.test.ts (11.02 s)
  attestation + mint flow — happy path
    ✓ completes the job and event only after on-chain finality is confirmed (224 ms)
    ✓ persists the full job state machine transitions in order (54 ms)
    ✓ records the verified content and manifest hashes on the event (53 ms)
    ✓ processes multiple events in a single cycle, completing each independently (91 ms)
  attestation + mint flow — failure path
    ✓ marks the job and event FAILED when the on-chain mint transaction fails (54 ms)
    ✓ marks the job FAILED and does not mint when SPV verification rejects (37 ms)
    ✓ marks the job FAILED without retry when simulation rejects the mint (45 ms)
    ✓ clears the recorded tx hash when the RPC rejects the submission pre-ledger (43 ms)
  attestation + mint flow — idempotency and recovery
    ✓ does not re-mint when the event is reclaimed after a crash mid-minting (30 ms)
    ✓ does not process an already-completed job again (20 ms)

Tests: 10 passed, 10 total
```
