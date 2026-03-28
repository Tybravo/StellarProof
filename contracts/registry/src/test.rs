#![cfg(test)]
extern crate std;

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{Address, BytesN, Env};

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Registers the contract, initialises it with a fresh admin, and returns
/// `(client, admin_address)`.
fn setup(env: &Env) -> (RegistryClient, Address) {
    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let provenance = Address::generate(env);
    client.init(&admin, &provenance);
    (client, admin)
}

// ---------------------------------------------------------------------------
// Existing verification-flow tests (updated to use initialize + mock_all_auths)
// ---------------------------------------------------------------------------

#[test]
fn test_successful_verification() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin) = setup(&env);
    let _ = admin; // admin address stored; auth mocked globally

    let (signing_key, pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[77; 32]);

    client.add_provider(&pk);
    client.add_tee_hash(&tee_hash);
    client.create_request(&1);

    let attestation = Attestation {
        provider: pk.clone(),
        tee_hash: tee_hash.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 2048];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };

    let signature = sign_payload(&env, &signing_key, payload_slice);

    client.process_verification(&1, &attestation, &signature);

    let req = client.get_request(&1).unwrap();
    assert_eq!(req.state, RequestState::Verified);
}

#[test]
#[should_panic]
fn test_invalid_signature() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let (_signing_key, pk) = create_keypair(&env, 1);
    let (_other_key, _other_pk) = create_keypair(&env, 2);
    let tee_hash = BytesN::from_array(&env, &[77; 32]);

    client.add_provider(&pk);
    client.add_tee_hash(&tee_hash);
    client.create_request(&1);

    let attestation = Attestation {
        provider: pk.clone(),
        tee_hash: tee_hash.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 2048];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };

    // Sign with WRONG key
    let signature = sign_payload(&env, &_other_key, payload_slice);

    // This will abort the transaction entirely because ed25519_verify aborts.
    client.process_verification(&1, &attestation, &signature);
}

#[test]
fn test_unauthorized_provider() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let (signing_key, pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[77; 32]);
    // DO NOT AUTHORIZE this provider

    client.add_tee_hash(&tee_hash);
    client.create_request(&1);

    let attestation = Attestation {
        provider: pk.clone(),
        tee_hash: tee_hash.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 2048];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };

    let signature = sign_payload(&env, &signing_key, payload_slice);

    let result = client.try_process_verification(&1, &attestation, &signature);
    assert_eq!(
        result,
        Ok(Ok(RequestState::Rejected(soroban_sdk::String::from_str(
            &env,
            "Unauthorized"
        ))))
    );

    let req = client.get_request(&1).unwrap();
    assert_eq!(
        req.state,
        RequestState::Rejected(soroban_sdk::String::from_str(&env, "Unauthorized"))
    );
}

#[test]
fn test_invalid_tee_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let (signing_key, pk) = create_keypair(&env, 1);
    let unauthorized_tee_hash = BytesN::from_array(&env, &[88; 32]);

    client.add_provider(&pk);
    // DO NOT add the tee_hash used in the attestation
    client.create_request(&1);

    let attestation = Attestation {
        provider: pk.clone(),
        tee_hash: unauthorized_tee_hash.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 2048];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };

    let signature = sign_payload(&env, &signing_key, payload_slice);

    let result = client.try_process_verification(&1, &attestation, &signature);
    assert_eq!(
        result,
        Ok(Ok(RequestState::Rejected(soroban_sdk::String::from_str(
            &env,
            "InvalidTeeHash"
        ))))
    );

    let req = client.get_request(&1).unwrap();
    assert_eq!(
        req.state,
        RequestState::Rejected(soroban_sdk::String::from_str(&env, "InvalidTeeHash"))
    );
}

#[test]
fn test_invalid_attestation() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let (signing_key, pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[77; 32]);

    client.add_provider(&pk);
    client.add_tee_hash(&tee_hash);
    client.create_request(&1); // id is 1

    // Attestation claims id is 2
    let attestation = Attestation {
        provider: pk.clone(),
        tee_hash: tee_hash.clone(),
        request_id: 2,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 2048];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };

    let signature = sign_payload(&env, &signing_key, payload_slice);

    // Call with id 1, but attestation has id 2
    let result = client.try_process_verification(&1, &attestation, &signature);
    assert_eq!(
        result,
        Ok(Ok(RequestState::Rejected(soroban_sdk::String::from_str(
            &env,
            "InvalidAttestation"
        ))))
    );

    let req = client.get_request(&1).unwrap();
    assert_eq!(
        req.state,
        RequestState::Rejected(soroban_sdk::String::from_str(&env, "InvalidAttestation"))
    );
}

#[test]
fn test_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let (signing_key, pk) = create_keypair(&env, 1);
    let tee_hash = BytesN::from_array(&env, &[77; 32]);

    // No request is created

    let attestation = Attestation {
        provider: pk.clone(),
        tee_hash: tee_hash.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 2048];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };

    let signature = sign_payload(&env, &signing_key, payload_slice);

    let result = client.try_process_verification(&1, &attestation, &signature);
    assert_eq!(result, Err(Ok(VerificationError::NotFound)));
}

#[test]
fn test_registry_events() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let pk = BytesN::from_array(&env, &[1; 32]);
    let hash = BytesN::from_array(&env, &[2; 32]);

    // Test ProviderAdded
    client.add_provider(&pk);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("ProviderAdded"));
    assert!(events_str.contains("registry"));
    assert!(events_str.contains("provider"));

    // Test ProviderRemoved
    client.remove_provider(&pk);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("ProviderRemoved"));
    assert!(events_str.contains("registry"));

    // Test TeeHashAdded
    client.add_tee_hash(&hash);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashAdded"));
    assert!(events_str.contains("registry"));
    assert!(events_str.contains("hash"));

    // Test TeeHashRemoved
    client.remove_tee_hash(&hash);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashRemoved"));
    assert!(events_str.contains("registry"));
}

// ---------------------------------------------------------------------------
// New: add_tee_hash admin-guard tests
// ---------------------------------------------------------------------------

/// Happy path: admin adds a hash → stored and retrievable.
#[test]
fn test_add_tee_hash_stores_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);
    let hash = BytesN::from_array(&env, &[42; 32]);

    // Hash must not exist before insertion.
    assert!(!client.has_tee_hash(&hash));

    client.add_tee_hash(&hash);

    // Hash must be retrievable after insertion.
    assert!(client.has_tee_hash(&hash));
}

/// Happy path: add_tee_hash emits a TeeHashAdded event containing the hash.
#[test]
fn test_add_tee_hash_emits_event() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);
    let hash = BytesN::from_array(&env, &[99; 32]);

    client.add_tee_hash(&hash);

    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashAdded"));
    assert!(events_str.contains("registry"));
}

/// get_admin returns the address set during initialize.
#[test]
fn test_initialize_sets_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let provenance = Address::generate(&env);

    client.init(&admin, &provenance);

    assert_eq!(client.get_admin(), Some(admin));
}

/// Calling init twice must panic.
#[test]
#[should_panic(expected = "Already initialized")]
fn test_already_initialized_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let provenance = Address::generate(&env);

    client.init(&admin, &provenance);
    // This second call should panic
    client.init(&admin, &provenance);
}

/// Calling add_tee_hash before initialize (no admin set) must return Unauthorized.
#[test]
fn test_add_tee_hash_no_admin_returns_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    // Register without calling initialize.
    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);
    let hash = BytesN::from_array(&env, &[7; 32]);

    let result = client.try_add_tee_hash(&hash);
    assert_eq!(result, Err(Ok(VerificationError::Unauthorized)));
}

/// A non-admin caller must not be able to add a TEE hash.
/// Without mocking the admin's auth, `require_auth` aborts the invocation.
#[test]
#[should_panic]
fn test_add_tee_hash_non_admin_panics() {
    let env = Env::default();
    // No auths mocked — require_auth for the admin will abort.

    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    // init doesn't require auth itself, so mock only for that call.
    env.mock_all_auths();
    let provenance = Address::generate(&env);
    client.init(&admin, &provenance);
    // Drop all mocked auths so the next call has no auth context.
    env.mock_auths(&[]);

    let hash = BytesN::from_array(&env, &[55; 32]);

    // admin.require_auth() will abort — no auth is mocked for admin.
    client.add_tee_hash(&hash);
}

/// Multiple distinct hashes can each be stored and retrieved independently.
#[test]
fn test_add_tee_hash_multiple_hashes() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);

    let hash_a = BytesN::from_array(&env, &[0xAA; 32]);
    let hash_b = BytesN::from_array(&env, &[0xBB; 32]);
    let hash_c = BytesN::from_array(&env, &[0xCC; 32]);

    client.add_tee_hash(&hash_a);
    client.add_tee_hash(&hash_b);
    client.add_tee_hash(&hash_c);

    assert!(client.has_tee_hash(&hash_a));
    assert!(client.has_tee_hash(&hash_b));
    assert!(client.has_tee_hash(&hash_c));

    // An unregistered hash must not be present.
    let hash_unknown = BytesN::from_array(&env, &[0xFF; 32]);
    assert!(!client.has_tee_hash(&hash_unknown));
}

// ---------------------------------------------------------------------------
// New: remove_tee_hash admin-guard tests
// ---------------------------------------------------------------------------

/// Happy path: admin removes a hash → no longer retrievable.
#[test]
fn test_remove_tee_hash_removes_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin) = setup(&env);
    let hash = BytesN::from_array(&env, &[0xAB; 32]);

    client.add_tee_hash(&hash);
    assert!(client.has_tee_hash(&hash));

    client.remove_tee_hash(&hash);
    assert!(!client.has_tee_hash(&hash));
}

/// Calling remove_tee_hash before initialize (no admin set) must return Unauthorized.
#[test]
fn test_remove_tee_hash_no_admin_returns_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();

    // Register without calling initialize.
    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);
    let hash = BytesN::from_array(&env, &[0xCD; 32]);

    let result = client.try_remove_tee_hash(&hash);
    assert_eq!(result, Err(Ok(VerificationError::Unauthorized)));
}

/// A non-admin caller must not be able to remove a TEE hash.
/// Without mocking the admin's auth, `require_auth` aborts the invocation.
#[test]
#[should_panic]
fn test_remove_tee_hash_non_admin_panics() {
    let env = Env::default();
    // No auths mocked — require_auth for the admin will abort.

    let contract_id = env.register(Registry, ());
    let client = RegistryClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    // init doesn't require auth itself, so mock only for that call.
    env.mock_all_auths();
    let provenance = Address::generate(&env);
    client.init(&admin, &provenance);
    // Drop all mocked auths so the next call has no auth context.
    env.mock_auths(&[]);

    let hash = BytesN::from_array(&env, &[0xEF; 32]);

    // admin.require_auth() will abort — no auth is mocked for admin.
    client.remove_tee_hash(&hash);
}
