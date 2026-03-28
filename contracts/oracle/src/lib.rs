#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env, IntoVal,
    InvokeError, Symbol, Val, Vec, vec,
};

#[contracttype]
pub enum DataKey {
    Registry,
    Provenance,
    Admin,
    Provider(Address),
    /// Monotonically increasing counter for request IDs.
    NextRequestId,
    /// Temporary-storage key for a specific verification request.
    Request(u64),
}

/// Fixed TTL (in ledgers) for verification requests stored in temporary storage.
const REQUEST_TTL_LEDGERS: u32 = 100;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestState {
    Pending,
    Verified,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VerificationRequest {
    pub id: u64,
    pub content_hash: BytesN<32>,
    pub state: RequestState,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    UnauthorizedSigner = 2,
    AlreadyInitialized = 3,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    /// Oracle has not been initialized with a registry address.
    RegistryNotConfigured = 1,
    /// Cross-contract call to the registry failed (e.g. missing function, bad address).
    RegistryCallFailed = 2,
    /// The registry does not recognize the provided TEE hash as trusted.
    TeeNotVerified = 3,
}


#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn init(env: Env, registry: Address, provenance: Address, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Registry) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage()
            .instance()
            .set(&DataKey::Provenance, &provenance);
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    pub fn add_provider(env: Env, provider: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set; initialize first");
        admin.require_auth();

        let key = DataKey::Provider(provider);
        env.storage().persistent().set(&key, &true);
    }

    pub fn remove_provider(env: Env, provider: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Admin not set; initialize first");
        admin.require_auth();

        let key = DataKey::Provider(provider);
        env.storage().persistent().remove(&key);
    }

    pub fn is_provider(env: Env, provider: Address) -> bool {
        let key = DataKey::Provider(provider);
        env.storage().persistent().has(&key)
    }

    /// Verifies a cryptographic signature from a TEE provider.
    /// Calls the Registry contract to ensure both the provider and TEE hash are authorized.
    /// Rejects with `OracleError::UnauthorizedSigner` if unauthorized.
    /// Aborts (panics) if the Ed25519 signature is invalid.
    pub fn verify_attestation(
        env: Env,
        provider: BytesN<32>,
        tee_hash: BytesN<32>,
        payload: Bytes,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        let registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .ok_or(Error::NotInitialized)?;

        // Verify provider and hash are authorized in the Registry
        let is_verified: bool = env.invoke_contract(
            &registry,
            &soroban_sdk::Symbol::new(&env, "is_verified"),
            soroban_sdk::vec![
                &env,
                tee_hash.into_val(&env),
                provider.clone().into_val(&env)
            ],
        );

        if !is_verified {
            return Err(Error::UnauthorizedSigner);
        }

        // Verify the cryptographic signature (aborts entirely if invalid)
        env.crypto().ed25519_verify(&provider, &payload, &signature);

        Ok(())
    }



    /// Submit a new content verification request to the Oracle.
    ///
    /// Generates a unique request ID, stores the request in temporary storage
    /// with `Pending` state, and returns the request ID to the caller.
    pub fn submit_request(env: Env, content_hash: BytesN<32>) -> u64 {
        // 1. Load and increment the monotonically increasing request counter.
        let mut next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextRequestId)
            .unwrap_or(0);
        next_id += 1;
        env.storage()
            .instance()
            .set(&DataKey::NextRequestId, &next_id);

        // 2. Build the verification request in Pending state.
        let request = VerificationRequest {
            id: next_id,
            content_hash,
            state: RequestState::Pending,
        };

        // 3. Store the request in temporary storage keyed by its ID and set TTL.
        let key = DataKey::Request(next_id);
        env.storage().temporary().set(&key, &request);
        // Ensure the request lives for a fixed TTL window.
        env.storage()
            .temporary()
            .extend_ttl(&key, 0, REQUEST_TTL_LEDGERS);

        // 4. Return the unique request ID to the caller.
        next_id
    }

    /// Verify a TEE measurement hash via the external Registry contract.
    ///
    /// This performs a cross-contract call to the Registry's `is_verified`
    /// function using the stored Registry address.
    ///
    /// - If the registry reports the hash as not verified, this returns
    ///   `Err(OracleError::TeeNotVerified)`.
    /// - If the cross-contract call itself fails (e.g. bad address, missing
    ///   function), this returns `Err(OracleError::RegistryCallFailed)`.
    /// - If the Oracle was never initialized with a registry address, this
    ///   returns `Err(OracleError::RegistryNotConfigured)`.
    pub fn verify_tee_hash(env: Env, tee_hash: BytesN<32>) -> Result<(), OracleError> {
        // 1. Load the configured registry address.
        let registry: Address = env
            .storage()
            .instance()
            .get(&DataKey::Registry)
            .ok_or(OracleError::RegistryNotConfigured)?;

        // 2. Call `has_tee_hash` on the registry via a cross-contract call.
        //    Use `try_invoke_contract` so that we can handle failures
        //    gracefully instead of aborting the transaction.
        let func = Symbol::new(&env, "has_tee_hash");
        let args: Vec<Val> = vec![&env, tee_hash.into_val(&env)];

        let result = env.try_invoke_contract::<bool, InvokeError>(&registry, &func, args);

        match result {
            // Cross-contract call succeeded and returned a value.
            Ok(Ok(true)) => Ok(()),
            Ok(Ok(false)) => Err(OracleError::TeeNotVerified),
            // Any failure to invoke or decode the result from the registry
            // is treated as a generic cross-contract call failure.
            Ok(Err(_)) | Err(_) => Err(OracleError::RegistryCallFailed),
        }
    }
}

mod test;
