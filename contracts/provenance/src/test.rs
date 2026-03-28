#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Events, Address, Env, String};

#[test]
fn test_mint_certificate() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    let owner = Address::generate(&env);

    // Initialize contract with oracle address
    client.initialize(&oracle);

    let details = CertificateDetails {
        storage_id: String::from_str(&env, "storage_abc123"),
        manifest_hash: String::from_str(&env, "abc123hash"),
        attestation_hash: String::from_str(&env, "attest_abc123"),
    };

    let cert_id = client.mint(&owner, &details);
    assert_eq!(cert_id, 1);

    let cert = client.get_certificate(&cert_id);
    let certificate = client.get_certificate(&cert_id);
    assert!(certificate.is_ok());

    let cert = certificate.unwrap();
    assert_eq!(cert.storage_id, details.storage_id);
    assert_eq!(cert.manifest_hash, details.manifest_hash);
    assert_eq!(cert.attestation_hash, details.attestation_hash);
    assert_eq!(cert.creator, owner);
    assert_eq!(cert.timestamp, env.ledger().timestamp(), "timestamp must be set at mint time");
}

#[test]
fn test_mint_multiple_certificates() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    let owner1 = Address::generate(&env);
    let owner2 = Address::generate(&env);

    // Initialize contract
    client.initialize(&oracle);

    let details1 = CertificateDetails {
        storage_id: String::from_str(&env, "s1"),
        manifest_hash: String::from_str(&env, "hash1"),
        attestation_hash: String::from_str(&env, "a1"),
    };
    let details2 = CertificateDetails {
        storage_id: String::from_str(&env, "s2"),
        manifest_hash: String::from_str(&env, "hash2"),
        attestation_hash: String::from_str(&env, "a2"),
    };
    let details3 = CertificateDetails {
        storage_id: String::from_str(&env, "s3"),
        manifest_hash: String::from_str(&env, "hash3"),
        attestation_hash: String::from_str(&env, "a3"),
    };

    // Mint multiple certificates
    let cert_id1 = client.mint(&owner1, &details1);
    let cert_id2 = client.mint(&owner2, &details2);
    let cert_id3 = client.mint(&owner1, &details3);

    assert_eq!(cert_id1, 1);
    assert_eq!(cert_id2, 2);
    assert_eq!(cert_id3, 3);

    // Verify all certificates exist
    client.get_certificate(&cert_id1);
    client.get_certificate(&cert_id2);
    client.get_certificate(&cert_id3);
    assert!(client.get_certificate(&cert_id1).is_ok());
    assert!(client.get_certificate(&cert_id2).is_ok());
    assert!(client.get_certificate(&cert_id3).is_ok());
}

#[test]
fn test_get_nonexistent_certificate() {
    let env = Env::default();
    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);

    let result = client.try_get_certificate(&999);
    match result {
        // Contract call succeeded but returned our custom error
        Err(Ok(ProvenanceError::CertificateNotFound)) => {}
        other => panic!(
            "expected CertificateNotFound error, got: {other:?}"
        ),
    }
    assert_eq!(result, Ok(Err(ProvenanceError::CertificateNotFound)));
}

#[test]
#[should_panic(expected = "Contract not initialized")]
fn test_mint_without_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let details = CertificateDetails {
        storage_id: String::from_str(&env, "s"),
        manifest_hash: String::from_str(&env, "hash"),
        attestation_hash: String::from_str(&env, "a"),
    };

    client.mint(&owner, &details);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_double_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);

    // Initialize once
    client.initialize(&oracle);

    client.initialize(&oracle);
}

#[test]
fn test_certificate_minted_event() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);
    let oracle = Address::generate(&env);
    let owner = Address::generate(&env);

    client.initialize(&oracle);
    let details = CertificateDetails {
        storage_id: String::from_str(&env, "sid"),
        manifest_hash: String::from_str(&env, "mhash"),
        attestation_hash: String::from_str(&env, "ahash"),
    };

    let cert_id = client.mint(&owner, &details);
    assert_eq!(cert_id, 1);

    let events = Events::all(&env.events());
    let events_str = std::format!("{:#?}", events);
    assert!(
        events_str.contains("CertificateMinted") || events_str.contains("certificate_minted"),
        "CertificateMinted event should be emitted; events: {events_str}"
    );
}

#[test]
fn test_immutable_timestamp() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);
    let oracle = Address::generate(&env);
    let owner = Address::generate(&env);

    client.initialize(&oracle);
    let details = CertificateDetails {
        storage_id: String::from_str(&env, "sid"),
        manifest_hash: String::from_str(&env, "mhash"),
        attestation_hash: String::from_str(&env, "ahash"),
    };

    let cert_id = client.mint(&owner, &details);
    let cert = client.get_certificate(&cert_id);
    let stored_timestamp = cert.timestamp;
    assert_eq!(
        stored_timestamp,
        env.ledger().timestamp(),
        "timestamp must equal ledger time at mint"
    );

    let cert_again = client.get_certificate(&cert_id);
    assert_eq!(
        cert_again.timestamp,
        stored_timestamp,
        "timestamp is immutable and must not change on subsequent reads"
    );
}

#[test]
#[should_panic(expected = "Certificate already exists for this manifest hash")]
fn test_prevent_duplicate_manifest_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(ProvenanceContract, ());
    let client = ProvenanceContractClient::new(&env, &contract_id);

    let oracle = Address::generate(&env);
    let owner = Address::generate(&env);

    client.initialize(&oracle);

    let details1 = CertificateDetails {
        storage_id: String::from_str(&env, "s1"),
        manifest_hash: String::from_str(&env, "dup_hash"),
        attestation_hash: String::from_str(&env, "a1"),
    };
    let details2 = CertificateDetails {
        storage_id: String::from_str(&env, "s2"),
        manifest_hash: String::from_str(&env, "dup_hash"),
        attestation_hash: String::from_str(&env, "a2"),
    };

    // First mint should succeed and create the mapping
    let _ = client.mint(&owner, &details1);

    // Second mint with the same manifest_hash must fail with a clear error
    let _ = client.mint(&owner, &details2);
}
