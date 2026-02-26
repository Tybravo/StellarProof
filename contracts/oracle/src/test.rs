#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_init() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);

    client.init(&registry, &provenance);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_init_already_initialized() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let registry = Address::generate(&env);
    let provenance = Address::generate(&env);

    client.init(&registry, &provenance);
    client.init(&registry, &provenance);
}
