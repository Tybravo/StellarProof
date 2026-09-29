import crypto from "crypto";
import { Keypair, StrKey, scValToNative, xdr } from "@stellar/stellar-sdk";
import { AppError } from "../errors/AppError";
import { OracleContract } from "../services/contracts/OracleContract";
import { RegistryContract } from "../services/contracts/RegistryContract";
import type { ContractQueryClient } from "../services/contracts/ContractReader";
import type { ContractCall } from "../utils/transactionBuilder";
import { RegistryAuthorizationService } from "../services/registryAuthorization.service";

const contractId = (): string => StrKey.encodeContract(crypto.randomBytes(32));
const boolVal = (value: boolean): xdr.ScVal => xdr.ScVal.scvBool(value);

describe("registry authorization prechecks", () => {
  it("queries Registry.is_verified with the TEE hash and provider bytes", async () => {
    const provider = Keypair.random().publicKey();
    const invoke = jest.fn(async (_call: ContractCall) => boolVal(true));
    const registry = new RegistryContract(contractId(), { invoke });
    const teeHash = crypto.randomBytes(32).toString("hex");

    await expect(registry.isVerified(teeHash, provider)).resolves.toBe(true);

    const call = invoke.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("Expected Registry contract invocation");
    expect(call.method).toBe("is_verified");
    expect(scValToNative(call.args[0])).toEqual(Buffer.from(teeHash, "hex"));
    expect(scValToNative(call.args[1])).toEqual(
      Buffer.from(StrKey.decodeEd25519PublicKey(provider))
    );
  });

  it("queries Oracle.is_provider with the provider address", async () => {
    const provider = Keypair.random().publicKey();
    const invoke = jest.fn(async (_call: ContractCall) => boolVal(true));
    const oracle = new OracleContract(contractId(), { invoke });

    await expect(oracle.isProvider(provider)).resolves.toBe(true);
    expect(invoke.mock.calls[0][0]).toMatchObject({ method: "is_provider" });
  });

  it("allows attestations only when both contracts authorize the provider", async () => {
    const registry = { isVerified: jest.fn(async () => true) };
    const oracle = { isProvider: jest.fn(async () => true) };
    const log = { warn: jest.fn() };
    const service = new RegistryAuthorizationService(registry, oracle, log);

    await expect(service.assertAuthorized("a".repeat(64), Keypair.random().publicKey())).resolves.toBeUndefined();
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("logs and rejects an unauthorized provider before submission", async () => {
    const registry = { isVerified: jest.fn(async () => false) };
    const oracle = { isProvider: jest.fn(async () => true) };
    const log = { warn: jest.fn() };
    const service = new RegistryAuthorizationService(registry, oracle, log);

    const error = await service
      .assertAuthorized("b".repeat(64), Keypair.random().publicKey())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("ATTESTATION_NOT_AUTHORIZED");
    expect(log.warn).toHaveBeenCalledWith(
      "Attestation authorization precheck failed",
      expect.objectContaining({ registryAuthorized: false, oracleAuthorized: true })
    );
  });

  it("rejects non-boolean contract responses", async () => {
    const client: ContractQueryClient = {
      invoke: jest.fn(async () => xdr.ScVal.scvString("yes")),
    };
    const registry = new RegistryContract(contractId(), client);

    await expect(
      registry.isVerified(crypto.randomBytes(32).toString("hex"), Keypair.random().publicKey())
    ).rejects.toMatchObject({ code: "REGISTRY_INVALID_RESPONSE" });
  });
});
