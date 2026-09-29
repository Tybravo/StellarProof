import crypto from "crypto";
import { Account, Keypair, StrKey, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { MintService, type MintJobContext, type MintStore } from "../services/mint.service";
import type { MintConfirmation, PreparedMint } from "../services/contracts/ProvenanceContract";
import { ProvenanceContract } from "../services/contracts/ProvenanceContract";

const txHash = (): string => crypto.randomBytes(32).toString("hex");
const jobId = "507f1f77bcf86cd799439011";

function prepared(transactionHash: string): PreparedMint {
  const source = Keypair.random();
  return {
    transactionHash,
    transaction: new TransactionBuilder(new Account(source.publicKey(), "1"), {
      fee: "100",
      networkPassphrase: "Test SDF Network ; September 2015",
    }).setTimeout(30).build(),
  };
}

describe("MintService", () => {
  function harness(existingTransactionHash?: string) {
    const context: MintJobContext = {
      jobId,
      assetId: "507f1f77bcf86cd799439012",
      manifestId: "507f1f77bcf86cd799439013",
      creatorId: "507f1f77bcf86cd799439014",
      ownerPublicKey: Keypair.random().publicKey(),
      mediaCid: "QmYwAPJzv5CZsnAzt8auVZRnGi7wR1hMrxYxwN1G8nWJ9Z",
      manifestHash: txHash(),
      attestationHash: txHash(),
      ...(existingTransactionHash ? { transactionHash: existingTransactionHash } : {}),
    };
    const transactionHash = existingTransactionHash ?? txHash();
    const confirmation: MintConfirmation = {
      transactionHash,
      certificateId: "41",
      ledgerSequence: 900,
      mintedAt: new Date("2026-09-29T00:00:00.000Z"),
    };
    const cached = { _id: "certificate", certificateId: "41", transactionHash };
    const contract = {
      prepareMint: jest.fn(async () => prepared(transactionHash)),
      submit: jest.fn(async () => undefined),
      confirm: jest.fn(async () => confirmation),
    };
    const store: MintStore = {
      findCached: jest.fn(async () => null),
      loadContext: jest.fn(async () => context),
      recordTransaction: jest.fn(async () => undefined),
      complete: jest.fn(async () => cached),
      ensureJobCompleted: jest.fn(async () => undefined),
    };
    const service = new MintService(() => contract, "C123", "testnet", store);
    return { service, contract, store, context, confirmation, cached, transactionHash };
  }

  it("builds mint details from database context and persists the hash before submit", async () => {
    const h = harness();
    const calls: string[] = [];
    h.store.recordTransaction = jest.fn(async () => { calls.push("record"); });
    h.contract.submit = jest.fn(async () => {
      calls.push("submit");
      return undefined;
    });

    await expect(h.service.mintForJob(jobId)).resolves.toEqual(h.cached);

    expect(h.contract.prepareMint).toHaveBeenCalledWith({
      to: h.context.ownerPublicKey,
      mediaCid: h.context.mediaCid,
      manifestHash: h.context.manifestHash,
      attestationHash: h.context.attestationHash,
    });
    expect(calls).toEqual(["record", "submit"]);
    expect(h.contract.confirm).toHaveBeenCalledWith(h.transactionHash);
    expect(h.store.complete).toHaveBeenCalledWith(
      h.context,
      h.confirmation,
      { contractAddress: "C123", stellarNetwork: "testnet" }
    );
  });

  it("resumes confirmation for a previously submitted transaction without reminting", async () => {
    const existing = txHash();
    const h = harness(existing);
    await h.service.mintForJob(jobId);
    expect(h.contract.prepareMint).not.toHaveBeenCalled();
    expect(h.contract.submit).not.toHaveBeenCalled();
    expect(h.contract.confirm).toHaveBeenCalledWith(existing);
  });

  it("returns the database certificate cache idempotently", async () => {
    const h = harness();
    (h.store.findCached as jest.Mock).mockResolvedValue(h.cached);
    await expect(h.service.mintForJob(jobId)).resolves.toEqual(h.cached);
    expect(h.store.ensureJobCompleted).toHaveBeenCalledWith(jobId, h.cached);
    expect(h.store.loadContext).not.toHaveBeenCalled();
    expect(h.contract.prepareMint).not.toHaveBeenCalled();
  });

  it("decodes the certificate ID from a confirmed Provenance transaction", async () => {
    const transactionHash = txHash();
    const soroban = {
      networkPassphrase: "Test SDF Network ; September 2015",
      loadAccount: jest.fn(),
      simulate: jest.fn(),
      sendTransaction: jest.fn(),
      getTransaction: jest.fn(async () => ({
        status: "SUCCESS",
        txHash: transactionHash,
        ledger: 77,
        createdAt: 1_800_000_000,
        returnValue: xdr.ScVal.scvU64(new xdr.Uint64(BigInt(51))),
      })),
    };
    const contract = new ProvenanceContract(
      StrKey.encodeContract(crypto.randomBytes(32)),
      Keypair.random(),
      soroban as never,
      10,
      1
    );

    await expect(contract.confirm(transactionHash)).resolves.toMatchObject({
      transactionHash,
      certificateId: "51",
      ledgerSequence: 77,
    });
  });
});
