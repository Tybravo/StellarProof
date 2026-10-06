import crypto from "crypto";
import {
  Address,
  Keypair,
  StrKey,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

import { OracleContract } from "../services/contracts/OracleContract";
import { ProvenanceContract } from "../services/contracts/ProvenanceContract";
import { RegistryContract } from "../services/contracts/RegistryContract";
import type { ContractQueryClient } from "../services/contracts/ContractReader";
import type {
  ContractTransactionClient,
  ContractTransactionResult,
} from "../services/contracts/ContractTransactionClient";

const contractId = (): string => StrKey.encodeContract(crypto.randomBytes(32));
const hash = (): string => crypto.randomBytes(32).toString("hex");

function queryClient(result: xdr.ScVal): ContractQueryClient & { invoke: jest.Mock } {
  return { invoke: jest.fn(async () => result) };
}

function transactionClient(
  result: ContractTransactionResult = {
    transactionHash: "ab".repeat(32),
    ledgerSequence: 123,
  }
): ContractTransactionClient & { submit: jest.Mock } {
  return { submit: jest.fn(async () => result) };
}

describe("typed Soroban contract clients", () => {
  it("Oracle submitRequest calls submit_request and decodes the returned u64", async () => {
    const signer = Keypair.random();
    const tx = transactionClient({
      transactionHash: "ab".repeat(32),
      ledgerSequence: 123,
      returnValue: nativeToScVal(42n, { type: "u64" }),
    });
    const id = contractId();
    const oracle = new OracleContract(id, signer, tx);
    const contentHash = hash();

    await expect(oracle.submitRequest(contentHash)).resolves.toMatchObject({
      requestId: "42",
      ledgerSequence: 123,
    });

    const call = tx.submit.mock.calls[0][0];
    expect(call.contractId).toBe(id);
    expect(call.method).toBe("submit_request");
    expect(call.args).toHaveLength(1);
    expect(Buffer.from(call.args[0].bytes()).toString("hex")).toBe(contentHash);
    expect(tx.submit.mock.calls[0][1]).toBe(signer);
  });

  it("Oracle verifyAttestation mirrors the Rust BytesN/Bytes argument layout", async () => {
    const signer = Keypair.random();
    const provider = Keypair.random();
    const tx = transactionClient();
    const oracle = new OracleContract(contractId(), signer, tx);
    const teeHash = hash();
    const payload = Uint8Array.from([1, 2, 3]);
    const signature = Uint8Array.from({ length: 64 }, (_, index) => index);

    await oracle.verifyAttestation({
      providerPublicKey: provider.publicKey(),
      teeHash,
      payload,
      signature,
    });

    const call = tx.submit.mock.calls[0][0];
    expect(call.method).toBe("verify_attestation");
    expect(call.args).toHaveLength(4);
    expect(Buffer.from(call.args[0].bytes())).toEqual(
      Buffer.from(StrKey.decodeEd25519PublicKey(provider.publicKey()))
    );
    expect(Buffer.from(call.args[1].bytes()).toString("hex")).toBe(teeHash);
    expect(Buffer.from(call.args[2].bytes())).toEqual(Buffer.from(payload));
    expect(Buffer.from(call.args[3].bytes())).toEqual(Buffer.from(signature));
  });

  it("Registry read methods use the shared query client and exact Rust names", async () => {
    const query = queryClient(nativeToScVal(true));
    const id = contractId();
    const registry = new RegistryContract(id, query);
    const teeHash = hash();

    await expect(registry.hasTeeHash(teeHash)).resolves.toBe(true);
    expect(query.invoke).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contractId: id,
        method: "has_tee_hash",
      })
    );

    await expect(registry.isHashVerified(teeHash)).resolves.toBe(true);
    expect(query.invoke).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contractId: id,
        method: "is_hash_verified",
      })
    );
  });

  it("Registry mutations delegate through the shared transaction client", async () => {
    const signer = Keypair.random();
    const tx = transactionClient();
    const id = contractId();
    const registry = new RegistryContract(id, signer, tx);
    const teeHash = hash();

    await registry.addTeeHash(teeHash);

    expect(tx.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: id,
        method: "add_tee_hash",
        args: expect.any(Array),
      }),
      signer
    );
  });

  it("Provenance getCertificate decodes the Rust Certificate fields", async () => {
    const creator = Keypair.random().publicKey();
    const value = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("attestation_hash"),
        val: xdr.ScVal.scvString(hash()),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("creator"),
        val: Address.fromString(creator).toScVal(),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("manifest_hash"),
        val: xdr.ScVal.scvString(hash()),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("storage_id"),
        val: xdr.ScVal.scvString("bafy-test"),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("timestamp"),
        val: nativeToScVal(99n, { type: "u64" }),
      }),
    ]);
    const query = queryClient(value);
    const signer = Keypair.random();
    const id = contractId();
    const unusedSoroban = {
      loadAccount: jest.fn(),
      simulate: jest.fn(),
      sendTransaction: jest.fn(),
      getTransaction: jest.fn(),
      networkPassphrase: "Test SDF Network ; September 2015",
    };
    const provenance = new ProvenanceContract(
      id,
      signer,
      unusedSoroban as never,
      120_000,
      1_000
    );

    const certificate = await provenance.getCertificate("7");

    expect(certificate).toEqual(
      expect.objectContaining({
        storageId: "bafy-test",
        creator,
        timestamp: "99",
      })
    );
    expect(query.invoke).toHaveBeenCalledWith({
      contractId: id,
      method: "get_certificate",
      args: [expect.anything()],
    });
    const arg = query.invoke.mock.calls[0][0].args[0];
    expect(scValToNative(arg)).toBe(7n);
  });
});
