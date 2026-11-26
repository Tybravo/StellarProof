import crypto from "crypto";
import {
  Account,
  Address,
  BASE_FEE,
  Keypair,
  Networks,
  SorobanDataBuilder,
  StrKey,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { ProvenanceContract } from "../services/contracts/ProvenanceContract";
import { AppError } from "../errors/AppError";
import type { ContractCall } from "../utils/transactionBuilder";
import { buildMintArgs } from "../utils/xdr";

const contractId = (): string => StrKey.encodeContract(crypto.randomBytes(32));
const OWNER = Keypair.random().publicKey();
const CID = "QmYwAPJzv5CZsnAzt8auVZRnGi7wR1hMrxYxwN1G8nWJ9Z";
const MANIFEST_HASH = "a".repeat(64);
const ATTESTATION_HASH = "b".repeat(64);
const TIMESTAMP = 1_800_000_000;

/** Encodes the on-chain `Certificate` contracttype as an ScMap. */
function certificateScVal(): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("storage_id"),
      val: xdr.ScVal.scvString(CID),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("manifest_hash"),
      val: xdr.ScVal.scvString(MANIFEST_HASH),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("attestation_hash"),
      val: xdr.ScVal.scvString(ATTESTATION_HASH),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("creator"),
      val: Address.fromString(OWNER).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("timestamp"),
      val: xdr.ScVal.scvU64(new xdr.Uint64(BigInt(TIMESTAMP))),
    }),
  ]);
}

describe("ProvenanceContract.getCertificate", () => {
  it("queries get_certificate with the u64 id and decodes the ledger record", async () => {
    const invoke = jest.fn(async (_call: ContractCall) => certificateScVal());
    const contract = new ProvenanceContract(contractId(), { invoke });

    const result = await contract.getCertificate("41");

    expect(invoke).toHaveBeenCalledTimes(1);
    const call = invoke.mock.calls[0][0];
    expect(call.method).toBe("get_certificate");
    expect(scValToNative(call.args[0]).toString()).toBe("41");
    expect(result).toEqual({
      storageId: CID,
      manifestHash: MANIFEST_HASH,
      attestationHash: ATTESTATION_HASH,
      creator: OWNER,
      timestamp: new Date(TIMESTAMP * 1_000),
    });
  });

  it("returns null when the contract reports no certificate", async () => {
    const invoke = jest.fn(async () => xdr.ScVal.scvVoid());
    const contract = new ProvenanceContract(contractId(), { invoke });

    await expect(contract.getCertificate("999")).resolves.toBeNull();
  });

  it("rejects a non-numeric certificate id", async () => {
    const contract = new ProvenanceContract(contractId(), { invoke: jest.fn() });

    await expect(contract.getCertificate("abc")).rejects.toMatchObject({
      code: "INVALID_CERTIFICATE_ID",
    });
  });

  it("rejects an unexpected contract response shape", async () => {
    const invoke = jest.fn(async () => xdr.ScVal.scvString("not-a-certificate"));
    const contract = new ProvenanceContract(contractId(), { invoke });

    await expect(contract.getCertificate("1")).rejects.toMatchObject({
      code: "PROVENANCE_INVALID_RESPONSE",
    });
  });

  it("throws when constructed without a query client", async () => {
    const fakeSoroban = {
      networkPassphrase: "Test SDF Network ; September 2015",
      loadAccount: jest.fn(),
      simulate: jest.fn(),
      sendTransaction: jest.fn(),
      getTransaction: jest.fn(),
    };
    const contract = new ProvenanceContract(
      contractId(),
      Keypair.random(),
      fakeSoroban as never
    );

    await expect(contract.getCertificate("1")).rejects.toMatchObject({
      code: "PROVENANCE_QUERY_NOT_CONFIGURED",
    });
  });

  it("returns null when the contract simulation reports not-found", async () => {
    const invoke = jest.fn(async () => {
      throw new AppError(
        "Soroban simulation failed: CertificateNotFound",
        422,
        "SOROBAN_SIMULATION_FAILED"
      );
    });
    const contract = new ProvenanceContract(contractId(), { invoke });

    await expect(contract.getCertificate("999")).resolves.toBeNull();
  });

  it("propagates transport failures instead of treating them as not-found", async () => {
    const invoke = jest.fn(async () => {
      throw new AppError("Soroban RPC timed out", 504, "SOROBAN_RPC_TIMEOUT");
    });
    const contract = new ProvenanceContract(contractId(), { invoke });

    await expect(contract.getCertificate("1")).rejects.toMatchObject({
      code: "SOROBAN_RPC_TIMEOUT",
    });
  });
});

describe("ProvenanceContract.prepareMint", () => {
  const RESOURCE_FEE = 12_345;
  const mintArgs = {
    to: OWNER,
    mediaCid: CID,
    manifestHash: MANIFEST_HASH,
    attestationHash: ATTESTATION_HASH,
  };

  function simulationSuccess(): rpc.Api.SimulateTransactionSuccessResponse {
    return {
      _parsed: true,
      id: "1",
      latestLedger: 1,
      events: [],
      transactionData: new SorobanDataBuilder(),
      minResourceFee: String(RESOURCE_FEE),
      result: { auth: [], retval: xdr.ScVal.scvU64(new xdr.Uint64(BigInt(1))) },
    };
  }

  /** Only the RPC client is faked; building, preparing and signing are real. */
  function harness() {
    const signer = Keypair.random();
    const target = contractId();
    const soroban = {
      networkPassphrase: Networks.TESTNET,
      loadAccount: jest.fn(async () => new Account(signer.publicKey(), "100")),
      simulate: jest.fn(async (): Promise<unknown> => simulationSuccess()),
      sendTransaction: jest.fn(async () => undefined),
      getTransaction: jest.fn(),
    };
    const contract = new ProvenanceContract(target, signer, soroban as never);
    return { signer, target, soroban, contract };
  }

  it("builds a mint invocation with the CertificateDetails arguments", async () => {
    const h = harness();
    const { transaction } = await h.contract.prepareMint(mintArgs);

    expect(h.soroban.loadAccount).toHaveBeenCalledWith(h.signer.publicKey());
    expect(transaction.source).toBe(h.signer.publicKey());
    expect(transaction.networkPassphrase).toBe(Networks.TESTNET);
    expect(transaction.operations).toHaveLength(1);
    const operation = transaction.operations[0];
    if (operation.type !== "invokeHostFunction") throw new Error("unexpected operation");
    const call = operation.func.invokeContract();
    expect(Address.fromScAddress(call.contractAddress()).toString()).toBe(h.target);
    expect(call.functionName().toString()).toBe("mint");
    expect(call.args().map((arg) => arg.toXDR("base64"))).toEqual(
      buildMintArgs(mintArgs).map((arg) => arg.toXDR("base64"))
    );
  });

  it("applies the simulation result and signs with the oracle key", async () => {
    const h = harness();
    const { transaction, transactionHash } = await h.contract.prepareMint(mintArgs);

    expect(h.soroban.simulate).toHaveBeenCalledTimes(1);
    expect(transaction.toEnvelope().v1().tx().ext().switch()).toBe(1);
    expect(transaction.fee).toBe(String(Number(BASE_FEE) + RESOURCE_FEE));
    expect(transaction.signatures).toHaveLength(1);
    expect(h.signer.verify(transaction.hash(), transaction.signatures[0].signature())).toBe(true);
    expect(transactionHash).toBe(transaction.hash().toString("hex"));
    expect(transactionHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("submits exactly the transaction it prepared", async () => {
    const h = harness();
    const prepared = await h.contract.prepareMint(mintArgs);

    expect(h.soroban.sendTransaction).not.toHaveBeenCalled();
    await h.contract.submit(prepared);
    expect(h.soroban.sendTransaction).toHaveBeenCalledWith(prepared.transaction);
  });

  it("propagates a rejected simulation", async () => {
    const h = harness();
    h.soroban.simulate.mockRejectedValue(
      new AppError("Soroban simulation failed", 422, "SOROBAN_SIMULATION_FAILED")
    );

    await expect(h.contract.prepareMint(mintArgs)).rejects.toMatchObject({
      code: "SOROBAN_SIMULATION_FAILED",
    });
    expect(h.soroban.sendTransaction).not.toHaveBeenCalled();
  });

  it("refuses when archived ledger entries must be restored first", async () => {
    const h = harness();
    h.soroban.simulate.mockResolvedValue({
      ...simulationSuccess(),
      restorePreamble: {
        minResourceFee: "1",
        transactionData: new SorobanDataBuilder(),
      },
    });

    await expect(h.contract.prepareMint(mintArgs)).rejects.toThrow(/restoring archived ledger entries/);
  });

  it("rejects invalid mint input before simulating", async () => {
    const h = harness();

    await expect(
      h.contract.prepareMint({ ...mintArgs, manifestHash: "not-a-hash" })
    ).rejects.toThrow(/manifestHash/);
    expect(h.soroban.simulate).not.toHaveBeenCalled();
  });
});
