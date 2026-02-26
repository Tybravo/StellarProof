#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, xdr::ToXdr, Address, BytesN, Env, String,
};

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
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RequestState {
    Pending,
    Verified,
    Rejected(String),
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
    /// Initialize the contract with an admin address.
    /// Must be called once before any admin-gated operations.
    pub fn initialize(env: Env, admin: Address) {
        env.storage().persistent().set(&DataKey::Admin, &admin);
    }

    /// Return the stored admin address, if any.
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Admin)
    }

    /// Add a trusted TEE measurement hash to the registry.
    /// Only the admin may call this function.
    /// Emits a `TeeHashAdded` event on success.
    pub fn add_tee_hash(env: Env, hash: BytesN<32>) -> Result<(), VerificationError> {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(VerificationError::Unauthorized)?;
        admin.require_auth();

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
            .persistent()
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

    /// Add an authorized Oracle provider to the registry.
    /// Only the admin may call this function.
    pub fn add_provider(env: Env, provider: BytesN<32>) -> Result<(), VerificationError> {
        let admin: Address = env
            .storage()
            .persistent()
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
            .persistent()
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
}

#[cfg(test)]
mod test;
