#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::storage::Temporary as _, testutils::Address as _, Address, BytesN, Env};

#[test]
fn test_init() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);

    client.init(&registry, &provenance, &admin);
}

#[test]
fn test_submit_request_stores_pending_in_temporary_storage() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    // Initialization not strictly required for submit_request, but keep setup consistent.
    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    let content_hash = BytesN::from_array(&env, &[5; 32]);

    let request_id = client.submit_request(&content_hash);
    assert_eq!(request_id, 1);

    // Verify the request is stored in temporary storage with Pending state.
    let key = DataKey::Request(request_id);
    // Access storage from the contract's context.
    let (stored, ttl) = env.as_contract(&contract_id, || {
        let stored: VerificationRequest = env
            .storage()
            .temporary()
            .get(&key)
            .expect("request must be stored");
        let ttl = env.storage().temporary().get_ttl(&key);
        (stored, ttl)
    });

    assert_eq!(stored.id, request_id);
    assert_eq!(stored.content_hash, content_hash);
    assert!(matches!(stored.state, RequestState::Pending));

    // TTL should be positive, indicating the entry is tracked in temporary storage.
    assert!(ttl > 0);
}

#[test]
fn test_submit_request_generates_unique_ids() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry, &provenance, &admin);

    let hash1 = BytesN::from_array(&env, &[1; 32]);
    let hash2 = BytesN::from_array(&env, &[2; 32]);

    let id1 = client.submit_request(&hash1);
    let id2 = client.submit_request(&hash2);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);

    let key1 = DataKey::Request(id1);
    let key2 = DataKey::Request(id2);

    // Access storage from the contract's context.
    let (req1, req2) = env.as_contract(&contract_id, || {
        let req1: VerificationRequest = env.storage().temporary().get(&key1).unwrap();
        let req2: VerificationRequest = env.storage().temporary().get(&key2).unwrap();
        (req1, req2)
    });

    assert_eq!(req1.id, id1);
    assert_eq!(req2.id, id2);
    assert_eq!(req1.content_hash, hash1);
    assert_eq!(req2.content_hash, hash2);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_init_already_initialized() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);

    client.init(&registry, &provenance, &admin);
    client.init(&registry, &provenance, &admin);
}

#[test]
fn test_provider_management() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    let provider = Address::generate(&env);

    client.init(&registry, &provenance, &admin);

    // Initially not a provider
    assert!(!client.is_provider(&provider));

    // Add provider
    client.add_provider(&provider);
    assert!(client.is_provider(&provider));

    // Remove provider
    client.remove_provider(&provider);
    assert!(!client.is_provider(&provider));
}

use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::Bytes;

fn create_keypair(env: &Env, seed: u8) -> (SigningKey, BytesN<32>) {
    let secret = [seed; 32];
    let signing_key = SigningKey::from_bytes(&secret);
    let public_key = signing_key.verifying_key();
    let pk_bytes: [u8; 32] = public_key.to_bytes();
    (signing_key, BytesN::from_array(env, &pk_bytes))
}

fn sign_payload(env: &Env, signing_key: &SigningKey, payload: &[u8]) -> BytesN<64> {
    let signature = signing_key.sign(payload);
    let sig_bytes: [u8; 64] = signature.to_bytes();
    BytesN::from_array(env, &sig_bytes)
}

// Registry Mock for testing
#[soroban_sdk::contract]
pub struct RegistryMock;

#[soroban_sdk::contractimpl]
impl RegistryMock {
    pub fn is_verified(_env: Env, hash: BytesN<32>, _provider: BytesN<32>) -> bool {
        // Just return true if the first byte of provider is 1 (for authorized testing)
        // and true if the first byte of hash is 88 (for valid hash testing)
        let hash_bytes = hash.to_array();

        // Simulate an authorized condition: Authorized provider (first byte = 1, since seed=1 creates a specific key, we just hardcode the expected mock outcome based on the seed we know we'll use, wait actually we can just use the exact byte value of the public key or just mock it cleanly)

        // Actually, let's just use the first byte of the array to control it:
        // Or simpler: We know we pass `[1; 32]` or `[2; 32]` for seed in `create_keypair`, but `create_keypair` creates real ed25519 keys so the first byte isn't 1.

        // Let's use a simpler mock: return true if the hash matches a specific known good value,
        // and provider matches a specific known good value. But we create keys dynamically.
        // Let's just say if hash == [88; 32], we only approve if provider isn't all zeros.

        // Let's use `hash` first byte to determine behavior:
        // if hash[0] == 88 -> return true (authorized)
        // if hash[0] == 99 -> return false (unauthorized)
        hash_bytes[0] == 88
    }

    pub fn has_tee_hash(_env: Env, hash: BytesN<32>) -> bool {
        let hash_bytes = hash.to_array();
        hash_bytes[0] == 88
    }
}

#[test]
fn test_verify_attestation_success() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    // Register Registry Mock
    let registry_id = env.register(RegistryMock, ());

    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry_id, &provenance, &admin);

    let (signing_key, provider_pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[88; 32]); // 88 triggers true in mock

    let raw_payload = b"hello world";
    let payload = Bytes::from_slice(&env, raw_payload);
    let signature = sign_payload(&env, &signing_key, raw_payload);

    // Should succeed
    client.verify_attestation(&provider_pk, &tee_hash, &payload, &signature);
}

#[test]
fn test_verify_attestation_unauthorized_signer() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry_id = env.register(RegistryMock, ());
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry_id, &provenance, &admin);

    let (signing_key, provider_pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[99; 32]); // 99 triggers false in mock

    let raw_payload = b"hello world";
    let payload = Bytes::from_slice(&env, raw_payload);
    let signature = sign_payload(&env, &signing_key, raw_payload);

    let result = client.try_verify_attestation(&provider_pk, &tee_hash, &payload, &signature);
    assert_eq!(result, Err(Ok(Error::UnauthorizedSigner)));
}

#[test]
#[should_panic]
fn test_verify_attestation_invalid_signature() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry_id = env.register(RegistryMock, ());
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    client.init(&registry_id, &provenance, &admin);

    let (_, provider_pk) = create_keypair(&env, 1);
    let (other_signing_key, _) = create_keypair(&env, 2);
    let tee_hash = BytesN::from_array(&env, &[88; 32]); // 88 triggers true in mock

    let raw_payload = b"hello world";
    let payload = Bytes::from_slice(&env, raw_payload);

    // Sign with the WRONG key
    let signature = sign_payload(&env, &other_signing_key, raw_payload);

    // ed25519_verify aborts the host logic, so this panics
    client.verify_attestation(&provider_pk, &tee_hash, &payload, &signature);
}

#[test]
fn test_verify_attestation_not_initialized() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let (_, provider_pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[88; 32]);
    let payload = Bytes::from_slice(&env, b"");
    let signature = BytesN::from_array(&env, &[0; 64]);

    let result = client.try_verify_attestation(&provider_pk, &tee_hash, &payload, &signature);
    assert_eq!(result, Err(Ok(Error::NotInitialized)));
}



#[test]
fn test_verify_tee_hash_success() {
    let env = Env::default();
    env.mock_all_auths();

    // Use RegistryMock
    let registry_id = env.register(RegistryMock, ());
    let admin = Address::generate(&env);

    // Mock verification passes if hash starts with 88
    let tee_hash = BytesN::from_array(&env, &[88; 32]);

    // Set up oracle contract and initialize it with the registry address.
    let oracle_id = env.register(Contract, ());
    let oracle_client = ContractClient::new(&env, &oracle_id);

    let provenance = Address::generate(&env);
    oracle_client.init(&registry_id, &provenance, &admin);

    let result = oracle_client.try_verify_tee_hash(&tee_hash);
    // Outer Ok: contract call succeeded; inner Ok(()) means verification passed.
    assert_eq!(result, Ok(Ok(())));
}

#[test]
fn test_verify_tee_hash_invalid_hash() {
    let env = Env::default();
    env.mock_all_auths();

    // Use RegistryMock
    let registry_id = env.register(RegistryMock, ());
    let admin = Address::generate(&env);

    // Mock verification fails if hash doesn't start with 88 (e.g. 99)
    let unregistered_hash = BytesN::from_array(&env, &[99; 32]);

    // Set up oracle and point it at the registry.
    let oracle_id = env.register(Contract, ());
    let oracle_client = ContractClient::new(&env, &oracle_id);
    let provenance = Address::generate(&env);
    oracle_client.init(&registry_id, &provenance, &admin);

    let result = oracle_client.try_verify_tee_hash(&unregistered_hash);

    // The contract returns Err(OracleError::TeeNotVerified), which surfaces as:
    // Err(Ok(OracleError::TeeNotVerified)) from the try_ client.
    assert_eq!(result, Err(Ok(OracleError::TeeNotVerified)));
}

#[test]
fn test_verify_tee_hash_registry_call_failure() {
    let env = Env::default();
    env.mock_all_auths();

    // Set up oracle with a bogus "registry" address (not a contract),
    // so the cross-contract call will fail at the host level.
    let oracle_id = env.register(Contract, ());
    let oracle_client = ContractClient::new(&env, &oracle_id);

    let bogus_registry = Address::generate(&env);
    let provenance = Address::generate(&env);
    let admin = Address::generate(&env);
    oracle_client.init(&bogus_registry, &provenance, &admin);

    let tee_hash = BytesN::from_array(&env, &[3; 32]);

    let result = oracle_client.try_verify_tee_hash(&tee_hash);

    // Any host-level failure of the cross-contract call is mapped to
    // OracleError::RegistryCallFailed.
    assert_eq!(result, Err(Ok(OracleError::RegistryCallFailed)));
}
