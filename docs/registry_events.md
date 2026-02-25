# StellarProof Registry Events

This document details the exact events emitted by the `stellarproof` contract when the registry is modified. These events use the Soroban contract topic system to allow indexers, frontends, and external consumers to securely monitor specific on-chain behaviors without having to poll or process raw contract state on every ledger close.

## Event Specifications

All registry events follow a generic format under the namespace `stellar_proof`. This forms their first topic, allowing indexers to reliably filter registry updates produced by this contract.

### 1. ProviderAdded
Fired when a new authorized provider is successfully added to the system via `add_provider`.

- **Topic 1:** `stellar_proof` (Symbol)
- **Topic 2:** `ProviderAdded` (Symbol)
- **Topic 3:** `provider` (BytesN<32>) — the public key or address identifier of the provider being added.
- **Data Payload:**
  - `provider` (BytesN<32>): Contains the identifier of the authorized provider.

### 2. ProviderRemoved
Fired when an existing authorized provider is successfully removed from the system via `remove_provider`.

- **Topic 1:** `stellar_proof` (Symbol)
- **Topic 2:** `ProviderRemoved` (Symbol)
- **Topic 3:** `provider` (BytesN<32>) — the public key or address identifier of the provider being removed.
- **Data Payload:**
  - `provider` (BytesN<32>): Contains the identifier of the revoked provider.

### 3. TeeHashAdded
Fired when a new trusted TEE (Trusted Execution Environment) hash is added to the system via `add_tee_hash`.

- **Topic 1:** `stellar_proof` (Symbol)
- **Topic 2:** `TeeHashAdded` (Symbol)
- **Topic 3:** `hash` (BytesN<32>) — the new valid hash.
- **Data Payload:**
  - `hash` (BytesN<32>): Contains the exact 32-byte TEE hash value.

### 4. TeeHashRemoved
Fired when a TEE hash is explicitly revoked or removed from the system via `remove_tee_hash`.

- **Topic 1:** `stellar_proof` (Symbol)
- **Topic 2:** `TeeHashRemoved` (Symbol)
- **Topic 3:** `hash` (BytesN<32>) — the revoked hash.
- **Data Payload:**
  - `hash` (BytesN<32>): Contains the exact 32-byte TEE hash value.

## Indexing & Filtering Use Cases

Because the variable targets (`provider` and `hash`) are specified in Topic 3, indexers can build precise tracking:
- **Index all events for a specific provider:** Filter on `(Topic 1 = "stellar_proof", Topic 3 = <Provider_Address>)`
- **Track overall TEE state changes:** Filter on `(Topic 1 = "stellar_proof", Topic 2 = "TeeHashAdded" | "TeeHashRemoved")`
- **Track all registry activity:** Filter solely on `(Topic 1 = "stellar_proof")`

Since events are only fired *after* successfully committing the state change to storage, they strictly represent guaranteed persistent changes. Invalid transactions will not produce spurious logging.
