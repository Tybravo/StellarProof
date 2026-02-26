use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
pub enum DataKey {
    Registry,
    Provenance,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn init(env: Env, registry: Address, provenance: Address) {
        if env.storage().instance().has(&DataKey::Registry) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage()
            .instance()
            .set(&DataKey::Provenance, &provenance);
    }
}

mod test;
