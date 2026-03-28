#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, xdr::ToXdr, Address, BytesN, Env, String,
};

mod provenance {
    use soroban_sdk::{contractclient, contracttype, Address, Env, String};

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct CertificateDetails {
        pub storage_id: String,
        pub manifest_hash: String,
        pub attestation_hash: String,
    }

    #[contractclient(name = "Client")]
    pub trait ProvenanceClient {
        fn mint(env: &Env, to: Address, details: CertificateDetails) -> u64;
    }
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerificationError {
    NotFound = 1,
    Unauthorized = 2,
    InvalidSignature = 3,
    InvalidAttestation = 4,
    AlreadyProcessed = 5,
    InvalidTeeHash = 6,
    DuplicateHash = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestState {
    Pending,
    Verified,
    Rejected(String),
    Failed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationResult {
    pub success: bool,
    pub content_hash: String,
    pub certificate_id: Option<u64>,
    pub state: RequestState,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationRequest {
    pub id: u64,
    pub state: RequestState,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attestation {
    pub provider: BytesN<32>,
    pub tee_hash: BytesN<32>,
    pub request_id: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Request(u64),
    Provider(BytesN<32>),
    TeeHash(BytesN<32>),
    Provenance,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProviderEventData {
    pub provider: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TeeHashEventData {
    pub hash: BytesN<32>,
}

#[contract]
pub struct Registry;

#[contractimpl]
impl Registry {
    /// Initialize the contract with an admin address and provenance contract address.
    /// Must be called once before any admin-gated operations.
    pub fn init(env: Env, admin: Address, provenance: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Provenance, &provenance);
    }

    /// Return the stored admin address, if any.
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    /// Verify content and automatically mint provenance certificate on success
    /// 
    /// # Arguments
    /// * `content` - Content to verify
    /// * `expected_hash` - Expected hash of the content (as hex string)
    /// * `owner` - Owner address for the certificate
    /// 
    /// # Returns
    /// VerificationResult with success status and certificate ID if minted
    pub fn verify_and_mint(
        env: Env,
        content: String,
        expected_hash: String,
        owner: Address,
    ) -> VerificationResult {
        // Perform content verification
        let computed_hash_string = Self::compute_hash(&env, &content);
        let verification_success = computed_hash_string == expected_hash;
        
        if !verification_success {
            // Verification failed - return without minting
            return VerificationResult {
                success: false,
                content_hash: computed_hash_string,
                certificate_id: None,
                state: RequestState::Rejected(String::from_str(&env, "HashMismatch")),
            };
        }
        
        // Verification succeeded - mint provenance certificate
        let certificate_id = Self::mint_certificate(&env, &computed_hash_string, &owner);
        
        match certificate_id {
            Ok(cert_id) => VerificationResult {
                success: true,
                content_hash: computed_hash_string,
                certificate_id: Some(cert_id),
                state: RequestState::Verified,
            },
            Err(_) => {
                // Minting failed but verification succeeded
                // Handle error gracefully and return success without certificate
                VerificationResult {
                    success: true,
                    content_hash: computed_hash_string,
                    certificate_id: None,
                    state: RequestState::Failed,
                }
            }
        }
    }
    
    /// Compute hash of content using SHA-256 and return as hex string
    fn compute_hash(env: &Env, content: &String) -> String {
        // Convert string to bytes and compute SHA-256 hash
        let content_bytes = content.to_bytes();
        let hash: BytesN<32> = env.crypto().sha256(&content_bytes).into();
        
        // Convert first 8 bytes to hex string
        let hash_array = hash.to_array();
        let hex_chars: [u8; 16] = [
            b'0', b'1', b'2', b'3', b'4', b'5', b'6', b'7',
            b'8', b'9', b'a', b'b', b'c', b'd', b'e', b'f',
        ];
        
        let mut result_bytes: [u8; 16] = [0; 16];
        for i in 0..8 {
            let byte = hash_array[i];
            result_bytes[i * 2] = hex_chars[(byte >> 4) as usize];
            result_bytes[i * 2 + 1] = hex_chars[(byte & 0x0f) as usize];
        }
        
        // Convert byte array to String
        String::from_bytes(env, &result_bytes)
    }
    
    /// Call provenance contract to mint certificate
    fn mint_certificate(env: &Env, content_hash: &String, owner: &Address) -> Result<u64, ()> {
        // Get provenance contract address
        let provenance_addr: Address = match env.storage().instance().get(&DataKey::Provenance) {
            Some(addr) => addr,
            None => return Err(()),
        };
        
        // Create provenance contract client
        let provenance_client = provenance::Client::new(env, &provenance_addr);
        
        let details = provenance::CertificateDetails {
            storage_id: String::from_str(env, "unknown"),
            manifest_hash: content_hash.clone(),
            attestation_hash: String::from_str(env, ""),
        };
        
        // Call mint function with error handling
        match provenance_client.try_mint(owner, &details) {
            Ok(Ok(id)) => Ok(id),
            _ => Err(()),
        }
    }

    /// Add a trusted TEE measurement hash to the registry.
    /// Only the admin may call this function.
    /// Emits a `TeeHashAdded` event on success.
    /// Returns `DuplicateHash` error if the hash already exists.
    pub fn add_tee_hash(env: Env, hash: BytesN<32>) -> Result<(), VerificationError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(VerificationError::Unauthorized)?;
        admin.require_auth();

        // Check if hash already exists
        let exists: bool = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHash(hash.clone()))
            .unwrap_or(false);

        if exists {
            return Err(VerificationError::DuplicateHash);
        }

        env.storage()
            .persistent()
            .set(&DataKey::TeeHash(hash.clone()), &true);

        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "TeeHashAdded"),
                hash.clone(),
            ),
            TeeHashEventData { hash: hash.clone() },
        );

        Ok(())
    }

    /// Remove a TEE hash from the registry.
    /// Only the admin may call this function.
    pub fn remove_tee_hash(env: Env, hash: BytesN<32>) -> Result<(), VerificationError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(VerificationError::Unauthorized)?;
        admin.require_auth();

        env.storage().persistent().remove(&DataKey::TeeHash(hash.clone()));

        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "TeeHashRemoved"),
                hash.clone(),
            ),
            TeeHashEventData {
                hash: hash.clone(),
            },
        );

        Ok(())
    }

    /// Return whether `hash` is registered as a trusted TEE measurement.
    pub fn has_tee_hash(env: Env, hash: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::TeeHash(hash))
            .unwrap_or(false)
    }

    /// Public verification helper used by external contracts (e.g. the Oracle).
    ///
    /// Returns `true` if the provided TEE measurement hash is currently
    /// registered as trusted in the registry, `false` otherwise.
    pub fn is_hash_verified(env: Env, hash: BytesN<32>) -> bool {
        Self::has_tee_hash(env, hash)
    }

    /// Add an authorized Oracle provider to the registry.
    /// Only the admin may call this function.
    pub fn add_provider(env: Env, provider: BytesN<32>) -> Result<(), VerificationError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(VerificationError::Unauthorized)?;
        admin.require_auth();

        env.storage().persistent().set(&DataKey::Provider(provider.clone()), &true);
        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "ProviderAdded"),
                provider.clone(),
            ),
            ProviderEventData {
                provider: provider.clone(),
            },
        );

        Ok(())
    }

    /// Remove an Oracle provider from the registry.
    /// Only the admin may call this function.
    pub fn remove_provider(env: Env, provider: BytesN<32>) -> Result<(), VerificationError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(VerificationError::Unauthorized)?;
        admin.require_auth();

        env.storage().persistent().remove(&DataKey::Provider(provider.clone()));
        #[allow(deprecated)]
        env.events().publish(
            (
                soroban_sdk::Symbol::new(&env, "registry"),
                soroban_sdk::Symbol::new(&env, "ProviderRemoved"),
                provider.clone(),
            ),
            ProviderEventData {
                provider: provider.clone(),
            },
        );

        Ok(())
    }

    /// Setup helper: Create a pending request
    pub fn create_request(env: Env, id: u64) {
        let req = VerificationRequest {
            id,
            state: RequestState::Pending,
        };
        env.storage().persistent().set(&DataKey::Request(id), &req);
    }

    /// Get a request
    pub fn get_request(env: Env, id: u64) -> Option<VerificationRequest> {
        env.storage().persistent().get(&DataKey::Request(id))
    }

    /// Core processing logic
    pub fn process_verification(
        env: Env,
        request_id: u64,
        attestation: Attestation,
        signature: BytesN<64>,
    ) -> Result<RequestState, VerificationError> {
        // 1. Retrieve the verification request by request_id
        let mut req: VerificationRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(request_id))
            .ok_or(VerificationError::NotFound)?;

        // 2. Verify the request is in a processable state
        if req.state != RequestState::Pending {
            return Err(VerificationError::AlreadyProcessed);
        }

        // 3. Validate the signature ...
        let payload = attestation.clone().to_xdr(&env);
        env.crypto()
            .ed25519_verify(&attestation.provider, &payload, &signature);

        // 4. Registry check
        let is_authorized: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Provider(attestation.provider.clone()))
            .unwrap_or(false);

        if !is_authorized {
            req.state = RequestState::Rejected(String::from_str(&env, "Unauthorized"));
            env.storage().persistent().set(&DataKey::Request(request_id), &req);
            return Ok(req.state);
        }

        // 4.1 TEE Hash check
        let is_tee_authorized: bool = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHash(attestation.tee_hash.clone()))
            .unwrap_or(false);

        if !is_tee_authorized {
            req.state = RequestState::Rejected(String::from_str(&env, "InvalidTeeHash"));
            env.storage().persistent().set(&DataKey::Request(request_id), &req);
            return Ok(req.state);
        }

        // 5. Attestation validation
        if attestation.request_id != request_id {
            req.state = RequestState::Rejected(String::from_str(&env, "InvalidAttestation"));
            env.storage().persistent().set(&DataKey::Request(request_id), &req);
            return Ok(req.state);
        }

        // If all checks pass: update request state to Verified and save
        req.state = RequestState::Verified;
        env.storage().persistent().set(&DataKey::Request(request_id), &req);

        Ok(req.state)
    }

    /// Read-only function to verify if a hash and provider are trusted.
    /// Returns true only if both the TEE hash and the provider are authorized.
    pub fn is_verified(env: Env, hash: BytesN<32>, provider: BytesN<32>) -> bool {
        let is_tee_authorized = env
            .storage()
            .persistent()
            .get(&DataKey::TeeHash(hash))
            .unwrap_or(false);

        let is_auth_provider = env
            .storage()
            .persistent()
            .get(&DataKey::Provider(provider))
            .unwrap_or(false);

        is_tee_authorized && is_auth_provider
    }
}

#[cfg(test)]
mod test;
