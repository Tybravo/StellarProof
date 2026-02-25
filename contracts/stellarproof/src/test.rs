#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{BytesN, Env};
use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::xdr::ToXdr;

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

#[test]
fn test_successful_verification() {
    let env = Env::default();
    let contract_id = env.register(StellarProof, ());
    let client = StellarProofClient::new(&env, &contract_id);

    let (signing_key, pk) = create_keypair(&env, 1);

    // Setup
    client.add_provider(&pk);
    client.create_request(&1);

    // Create attestation
    let attestation = Attestation {
        provider: pk.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 1024];
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
    let contract_id = env.register(StellarProof, ());
    let client = StellarProofClient::new(&env, &contract_id);

    let (_signing_key, pk) = create_keypair(&env, 1);
    let (_other_key, _other_pk) = create_keypair(&env, 2);

    // Setup
    client.add_provider(&pk);
    client.create_request(&1);

    // Create attestation
    let attestation = Attestation {
        provider: pk.clone(), // claims to be pk
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 1024];
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
    let contract_id = env.register(StellarProof, ());
    let client = StellarProofClient::new(&env, &contract_id);

    let (signing_key, pk) = create_keypair(&env, 1);
    // DO NOT AUTHORIZE this provider

    client.create_request(&1);

    let attestation = Attestation {
        provider: pk.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 1024];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };
    
    let signature = sign_payload(&env, &signing_key, payload_slice);

    let result = client.try_process_verification(&1, &attestation, &signature);
    assert_eq!(result, Ok(Ok(RequestState::Rejected(soroban_sdk::String::from_str(&env, "Unauthorized")))));

    // Request state should be updated to Rejected
    let req = client.get_request(&1).unwrap();
    assert_eq!(req.state, RequestState::Rejected(soroban_sdk::String::from_str(&env, "Unauthorized")));
}

#[test]
fn test_invalid_attestation() {
    let env = Env::default();
    let contract_id = env.register(StellarProof, ());
    let client = StellarProofClient::new(&env, &contract_id);

    let (signing_key, pk) = create_keypair(&env, 1);

    client.add_provider(&pk);
    client.create_request(&1); // id is 1

    // Attestation claims id is 2
    let attestation = Attestation {
        provider: pk.clone(),
        request_id: 2,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 1024];
    let payload_slice = {
        let len = payload.len() as usize;
        payload.copy_into_slice(&mut payload_buf[..len]);
        &payload_buf[..len]
    };
    
    let signature = sign_payload(&env, &signing_key, payload_slice);

    // Call with id 1, but attestation has id 2
    let result = client.try_process_verification(&1, &attestation, &signature);
    assert_eq!(result, Ok(Ok(RequestState::Rejected(soroban_sdk::String::from_str(&env, "InvalidAttestation")))));

    // Request state should be updated to Rejected
    let req = client.get_request(&1).unwrap();
    assert_eq!(req.state, RequestState::Rejected(soroban_sdk::String::from_str(&env, "InvalidAttestation")));
}

#[test]
fn test_not_found() {
    let env = Env::default();
    let contract_id = env.register(StellarProof, ());
    let client = StellarProofClient::new(&env, &contract_id);

    let (signing_key, pk) = create_keypair(&env, 1);

    // No request is created

    let attestation = Attestation {
        provider: pk.clone(),
        request_id: 1,
    };

    let payload = attestation.clone().to_xdr(&env);
    let mut payload_buf = [0u8; 1024];
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
    extern crate std;
    let env = Env::default();
    let contract_id = env.register(StellarProof, ());
    let client = StellarProofClient::new(&env, &contract_id);

    let pk = BytesN::from_array(&env, &[1; 32]);
    let hash = BytesN::from_array(&env, &[2; 32]);

    // Test ProviderAdded
    client.add_provider(&pk);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("ProviderAdded"));
    assert!(events_str.contains("stellar_proof"));
    assert!(events_str.contains("provider"));

    // Test ProviderRemoved
    client.remove_provider(&pk);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("ProviderRemoved"));
    assert!(events_str.contains("stellar_proof"));

    // Test TeeHashAdded
    client.add_tee_hash(&hash);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashAdded"));
    assert!(events_str.contains("stellar_proof"));
    assert!(events_str.contains("hash"));

    // Test TeeHashRemoved
    client.remove_tee_hash(&hash);
    let events = soroban_sdk::testutils::Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(events_str.contains("TeeHashRemoved"));
    assert!(events_str.contains("stellar_proof"));
}
