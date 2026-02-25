#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_compute_hash() {
    let env = Env::default();
    let contract_id = env.register(StellarProofContract, ());
    let client = StellarProofContractClient::new(&env, &contract_id);
    
    let content = String::from_str(&env, "test content");
    
    // Compute hash using the contract
    let result = client.verify_and_mint(&content, &String::from_str(&env, "wronghash"), &Address::generate(&env));
    
    // Should fail verification with wrong hash
    assert!(!result.success);
    assert!(result.certificate_id.is_none());
    
    // The computed hash should be a 16-character hex string
    assert_eq!(result.content_hash.len(), 16);
}

#[test]
fn test_verify_success() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(StellarProofContract, ());
    let client = StellarProofContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let content = String::from_str(&env, "test content");
    
    // First, get the correct hash
    let result1 = client.verify_and_mint(&content, &String::from_str(&env, "wrong"), &owner);
    let correct_hash = result1.content_hash.clone();
    
    // Now verify with the correct hash
    let result2 = client.verify_and_mint(&content, &correct_hash, &owner);
    
    // Verification should succeed
    assert!(result2.success);
    assert_eq!(result2.content_hash, correct_hash);
    // Certificate ID will be None since provenance contract is not initialized
    assert!(result2.certificate_id.is_none());
}

#[test]
fn test_verify_failure() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(StellarProofContract, ());
    let client = StellarProofContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let content = String::from_str(&env, "test content");
    let wrong_hash = String::from_str(&env, "0000000000000000");
    
    // Verify with wrong hash
    let result = client.verify_and_mint(&content, &wrong_hash, &owner);
    
    // Verification should fail
    assert!(!result.success);
    assert!(result.certificate_id.is_none());
}

#[test]
fn test_different_content_different_hash() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(StellarProofContract, ());
    let client = StellarProofContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let content1 = String::from_str(&env, "content1");
    let content2 = String::from_str(&env, "content2");
    
    // Get hashes for different content
    let result1 = client.verify_and_mint(&content1, &String::from_str(&env, "x"), &owner);
    let result2 = client.verify_and_mint(&content2, &String::from_str(&env, "x"), &owner);
    
    // Different content should produce different hashes
    assert_ne!(result1.content_hash, result2.content_hash);
}

#[test]
fn test_same_content_same_hash() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register(StellarProofContract, ());
    let client = StellarProofContractClient::new(&env, &contract_id);
    
    let owner = Address::generate(&env);
    let content = String::from_str(&env, "same content");
    
    // Get hash twice for same content
    let result1 = client.verify_and_mint(&content, &String::from_str(&env, "x"), &owner);
    let result2 = client.verify_and_mint(&content, &String::from_str(&env, "x"), &owner);
    
    // Same content should produce same hash
    assert_eq!(result1.content_hash, result2.content_hash);
}
