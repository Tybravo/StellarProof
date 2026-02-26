# StellarProof Registry Events

This document details the exact events emitted by the `registry` smart contract during state changes. These events are strictly standardized to allow indexers, backend APIs, and decentralized clients to subscribe to and filter registry modifications continuously without relying on frequent, expensive storage polls.

All state transitions in the Provider and TEE Hash registries now automatically emit corresponding events.

## Topic Convention

Every registry event uses a two-topic structure:
1.  **Protocol Tag:** `"registry"` (identifies the event family)
2.  **Action Tag:** e.g., `"ProviderAdded"` (identifies the specific action)

This structured format enables clients to selectively query via Soroban's event filters:
*   **Track all registry activity:** Filter solely on `(Topic1 = "registry")`
*   **Track specific registry changes:** Filter on `(Topic1 = "registry", Topic2 = "ProviderAdded")`

---

## 1. Provider Events

### `ProviderAdded`
Emitted when an authorized Oracle Provider is added to the registry.

**Topics:**
*   Topic 1: `Symbol("registry")`
*   Topic 2: `Symbol("ProviderAdded")`
*   Topic 3: `BytesN<32>` (The public key of the assigned provider)

**Data Payload:**
```rust
struct ProviderEventData {
    provider: BytesN<32>
}
```

### `ProviderRemoved`
Emitted when an Oracle Provider is removed from the registry.

**Topics:**
*   Topic 1: `Symbol("registry")`
*   Topic 2: `Symbol("ProviderRemoved")`
*   Topic 3: `BytesN<32>` (The public key of the removed provider)

**Data Payload:**
```rust
struct ProviderEventData {
    provider: BytesN<32>
}
```

---

## 2. TEE Hash Events

### `TeeHashAdded`
Emitted when a new Trusted Execution Environment (TEE) binary measurement hash is authorized.

**Topics:**
*   Topic 1: `Symbol("registry")`
*   Topic 2: `Symbol("TeeHashAdded")`
*   Topic 3: `BytesN<32>` (The exact SHA256/binary hash of the TEE image)

**Data Payload:**
```rust
struct TeeHashEventData {
    hash: BytesN<32>
}
```

### `TeeHashRemoved`
Emitted when an existing TEE hash is revoked or removed.

**Topics:**
*   Topic 1: `Symbol("registry")`
*   Topic 2: `Symbol("TeeHashRemoved")`
*   Topic 3: `BytesN<32>` (The hash being removed)

**Data Payload:**
```rust
struct TeeHashEventData {
    hash: BytesN<32>
}
```

---

## Indexing Considerations

*   **Idempotency:** The contract utilizes the `set` operation. Adding an already existing provider will still trigger a `ProviderAdded` event, though the state effectively remains identical.
*   **Failed Transactions:** Events are only published if the host's invocation successfully commits. Invalid transactions will not produce spurious logging.
