jest.mock("../models/ContractSimulation.model", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    NODE_ENV: "test",
    STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
    STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    STELLAR_RPC_TIMEOUT_MS: 1000,
  },
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  Account,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  Operation,
  SorobanDataBuilder,
  StrKey,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import ContractSimulation from "../models/ContractSimulation.model";
import { AppError } from "../errors/AppError";
import { ContractSimulationService } from "../services/contractSimulation.service";
import type { ContractSimulationResult } from "../types/contractSimulation.types";
import type { SimulationResult, SorobanService } from "../services/soroban.service";

const signer = Keypair.random();
const contractId = StrKey.encodeContract(Buffer.alloc(32, 1));
const networkPassphrase = Networks.TESTNET;
const minimumResourceFee = "10000";
const transactionFee = (BigInt(BASE_FEE) + BigInt(minimumResourceFee)).toString();

function buildTransaction(fee = transactionFee): string {
  return new TransactionBuilder(new Account(signer.publicKey(), "1"), {
    fee,
    networkPassphrase,
  })
    .addOperation(new Contract(contractId).call("simulate"))
    .setTimeout(30)
    .build()
    .toXDR();
}

function successfulSimulation(auth: xdr.SorobanAuthorizationEntry[] = []): SimulationResult {
  return {
    _parsed: true,
    id: "simulation-id",
    latestLedger: 500,
    events: [],
    transactionData: new SorobanDataBuilder().setResources(200, 400, 600),
    minResourceFee: minimumResourceFee,
    result: { auth, retval: xdr.ScVal.scvVoid() },
  } as SimulationResult;
}

function savedDocument(input: Record<string, unknown>) {
  return {
    ...input,
    _id: { toString: () => "simulation-record-id" },
    createdAt: new Date("2026-09-28T12:00:00.000Z"),
  };
}

function makeSoroban(simulation: SimulationResult) {
  return {
    networkPassphrase,
    simulate: jest.fn().mockResolvedValue(simulation),
  } as unknown as Pick<SorobanService, "simulate" | "networkPassphrase">;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(ContractSimulation.create).mockImplementation(async (input) => savedDocument(input as Record<string, unknown>) as never);
});

describe("ContractSimulationService", () => {
  it("simulates valid contract XDR, validates fee, and returns the persisted typed result", async () => {
    const soroban = makeSoroban(successfulSimulation());
    const service = new ContractSimulationService(soroban);

    const result: ContractSimulationResult = await service.simulateContractCall({
      transactionXdr: buildTransaction(),
    });

    expect(soroban.simulate).toHaveBeenCalledTimes(1);
    expect(ContractSimulation.create).toHaveBeenCalledWith(expect.objectContaining({
      transactionFee,
      minimumRequiredFee: transactionFee,
      contractCalls: [{ contractId, functionName: "simulate" }],
      authorizationRequired: false,
      cpuInstructions: "200",
      readBytes: "400",
      writeBytes: "600",
    }));
    expect(result).toEqual(expect.objectContaining({
      id: "simulation-record-id",
      transactionFee,
      minimumRequiredFee: transactionFee,
      networkPassphrase,
      contractCalls: [{ contractId, functionName: "simulate" }],
      cost: { cpuInstructions: "200", readBytes: "400", writeBytes: "600" },
      createdAt: "2026-09-28T12:00:00.000Z",
    }));
  });

  it("rejects malformed XDR before calling the RPC or database", async () => {
    const soroban = makeSoroban(successfulSimulation());
    const service = new ContractSimulationService(soroban);

    await expect(service.simulateContractCall({ transactionXdr: "not-xdr" })).rejects.toMatchObject({
      statusCode: 400,
      code: "INVALID_TRANSACTION_XDR",
    });
    expect(soroban.simulate).not.toHaveBeenCalled();
    expect(ContractSimulation.create).not.toHaveBeenCalled();
  });

  it("rejects transactions that do not contain contract invocations", async () => {
    const transactionXdr = new TransactionBuilder(new Account(signer.publicKey(), "1"), {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(Operation.bumpSequence({ bumpTo: "10" }))
      .setTimeout(30)
      .build()
      .toXDR();
    const soroban = makeSoroban(successfulSimulation());
    const service = new ContractSimulationService(soroban);

    await expect(service.simulateContractCall({ transactionXdr })).rejects.toMatchObject({
      statusCode: 400,
      code: "CONTRACT_INVOCATION_REQUIRED",
    });
    expect(soroban.simulate).not.toHaveBeenCalled();
  });

  it("rejects a simulated transaction whose fee does not cover resource and inclusion costs", async () => {
    const soroban = makeSoroban(successfulSimulation());
    const service = new ContractSimulationService(soroban);

    await expect(service.simulateContractCall({ transactionXdr: buildTransaction(BASE_FEE) })).rejects.toMatchObject({
      statusCode: 422,
      code: "SOROBAN_INSUFFICIENT_FEE",
    });
    expect(ContractSimulation.create).not.toHaveBeenCalled();
  });

  it("returns authorization entries so callers can authorize before submission", async () => {
    const authEntryXdr = "authorization-entry-xdr";
    const authEntry = { toXDR: () => authEntryXdr } as unknown as xdr.SorobanAuthorizationEntry;
    const soroban = makeSoroban(successfulSimulation([authEntry]));
    const service = new ContractSimulationService(soroban);

    const result = await service.simulateContractCall({ transactionXdr: buildTransaction() });

    expect(result.authorizationRequired).toBe(true);
    expect(result.authEntriesXdr).toEqual([authEntryXdr]);
  });
});
