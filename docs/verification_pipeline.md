# Verification Pipeline Documentation

The Verification Pipeline is the core logic of the StellarProof system, now integrated into the Registry contract to ensure all verifications are validated against the authorized registry of providers and TEE environments.

## Workflow Overview

When an off-chain oracle provider processes a verification request, it submits an `Attestation` and a cryptographic `Signature` to the `process_verification` function. The pipeline executes the following steps in strict order to ensure deterministic and atomic transitions:

1. **Request Retrieval**: The contract lookups the `VerificationRequest` using the provided `request_id`.
2. **State Guard**: Ensures the request is in the `Pending` state. If it is already `Verified` or `Rejected`, the transaction fails with `AlreadyProcessed`.
3. **Signature Validation**: The `Signature` is verified against the `Attestation` payload using the provider's public key (found in the attestation).
4. **Registry Check**:
   - **Provider Authorization**: Validates that the signing provider is currently authorized in the `Provider` registry.
   - **TEE Hash Authorization**: Validates that the TEE hash reported in the attestation is currently authorized in the `TeeHash` registry.
5. **Attestation Correspondence**: Ensures the `request_id` within the attestation matches the `request_id` passed to the function.
6. **State Transition**:
   - On full success: State is updated to `Verified`.
   - On any validation failure: State is updated to `Rejected` with a specific reason.

## Failure Modes and Error Variants

The pipeline uses typed errors and state transitions to handle failures gracefully.

| Error | Meaning | State Transition |
|-------|---------|------------------|
| `NotFound` | The `request_id` does not exist in storage. | None (Transaction Fails) |
| `AlreadyProcessed` | The request is already in a final state (`Verified` or `Rejected`). | None (Transaction Fails) |
| `InvalidSignature` | The cryptographic signature does not match the attestation payload. | `Rejected` (Host Abort via `ed25519_verify`) |
| `Unauthorized` | The provider is not listed in the authorized registry. | `Rejected("Unauthorized")` |
| `InvalidTeeHash` | The TEE hash is not in the authorized list. | `Rejected("InvalidTeeHash")` |
| `InvalidAttestation` | The attestation payload is malformed or doesn't match the request ID. | `Rejected("InvalidAttestation")` |

## Atomic Storage

All state transitions are atomic. If a validation check fails (except for signature validation which aborts), the contract updates the request state to `Rejected` and persists it, ensuring no request is left in a `Pending` state after the pipeline has been invoked.
