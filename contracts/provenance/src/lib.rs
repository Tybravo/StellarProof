#![no_std]
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, symbol_short, Address, Env, String,
};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CertificateMinted {
    #[topic]
    pub owner: Address,
    #[topic]
    pub certificate_id: u64,
    #[topic]
    pub manifest_hash: String,
}

#[contract]
pub struct ProvenanceContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CertificateDetails {
    pub storage_id: String,
    pub manifest_hash: String,
    pub attestation_hash: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub storage_id: String,
    pub manifest_hash: String,
    pub attestation_hash: String,
    pub creator: Address,
    /// Ledger timestamp at mint time; set once and immutable (no update API).
    pub timestamp: u64,
}

#[contractimpl]
impl ProvenanceContract {
    /// Initialize the contract with the Oracle address
    ///
    /// # Arguments
    /// * `oracle` - Address of the Oracle contract authorized to mint certificates
    pub fn initialize(env: Env, oracle: Address) {
        // Ensure not already initialized
        if env.storage().persistent().has(&symbol_short!("ORACLE")) {
            panic!("Contract already initialized");
        }

        // Store oracle address
        env.storage()
            .persistent()
            .set(&symbol_short!("ORACLE"), &oracle);
    }

    /// Mint a new provenance certificate for verified content.
    /// Only callable by the Oracle contract.
    ///
    /// # Arguments
    /// * `to` - Address of the certificate recipient/owner (stored as `creator`)
    /// * `details` - Certificate details: storage_id, manifest_hash, attestation_hash
    ///
    /// # Returns
    /// Certificate ID on success. Emits `CertificateMinted` event.
    pub fn mint(env: Env, to: Address, details: CertificateDetails) -> u64 {
        // Get oracle address from storage
        let oracle: Address = env
            .storage()
            .persistent()
            .get(&symbol_short!("ORACLE"))
            .expect("Contract not initialized");

        // Require authorization from the oracle contract only
        oracle.require_auth();

        let mut counter: u64 = env
            .storage()
            .persistent()
            .get(&symbol_short!("CERT_CNT"))
            .unwrap_or(0);
        counter += 1;

        let mint_timestamp = env.ledger().timestamp();
        let certificate = Certificate {
            storage_id: details.storage_id.clone(),
            manifest_hash: details.manifest_hash.clone(),
            attestation_hash: details.attestation_hash.clone(),
            creator: to.clone(),
            timestamp: mint_timestamp,
        };

        let cert_key = (symbol_short!("CERT"), counter);
        env.storage().persistent().set(&cert_key, &certificate);
        env.storage()
            .persistent()
            .set(&symbol_short!("CERT_CNT"), &counter);

        CertificateMinted {
            owner: to.clone(),
            certificate_id: counter,
            manifest_hash: details.manifest_hash.clone(),
        }
        .publish(&env);

        counter
    }

    /// Get certificate by ID
    pub fn get_certificate(env: Env, certificate_id: u64) -> Option<Certificate> {
        let cert_key = (symbol_short!("CERT"), certificate_id);
        env.storage().persistent().get(&cert_key)
    }
}

mod test;
