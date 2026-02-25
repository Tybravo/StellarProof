#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, String};

mod provenance {
    soroban_sdk::contractimport!(
        file = "../provenance/target/wasm32-unknown-unknown/release/provenance.wasm"
    );
}

#[contract]
pub struct StellarProofContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationResult {
    pub success: bool,
    pub content_hash: String,
    pub certificate_id: Option<u64>,
}

#[contractimpl]
impl StellarProofContract {
    /// Initialize the contract with the provenance contract address
    pub fn initialize(env: Env, provenance_address: Address) {
        env.storage().instance().set(&symbol_short!("PROV_ADR"), &provenance_address);
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
            };
        }
        
        // Verification succeeded - mint provenance certificate
        let certificate_id = Self::mint_certificate(&env, &computed_hash_string, &owner);
        
        match certificate_id {
            Ok(cert_id) => VerificationResult {
                success: true,
                content_hash: computed_hash_string,
                certificate_id: Some(cert_id),
            },
            Err(_) => {
                // Minting failed but verification succeeded
                // Handle error gracefully and return success without certificate
                VerificationResult {
                    success: true,
                    content_hash: computed_hash_string,
                    certificate_id: None,
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
        let provenance_addr: Address = match env.storage().instance().get(&symbol_short!("PROV_ADR")) {
            Some(addr) => addr,
            None => return Err(()),
        };

        let provenance_client = provenance::Client::new(env, &provenance_addr);
        let details = provenance::CertificateDetails {
            storage_id: String::from_str(env, ""),
            manifest_hash: content_hash.clone(),
            attestation_hash: content_hash.clone(),
        };

        match provenance_client.try_mint(owner, &details) {
            Ok(result) => result.map_err(|_| ()),
            Err(_) => Err(()),
        }
    }
}

mod test;
