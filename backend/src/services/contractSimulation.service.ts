import {
  Address,
  BASE_FEE,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
} from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import ContractSimulation from "../models/ContractSimulation.model";
import { AppError } from "../errors/AppError";
import { sorobanService, type SorobanService } from "./soroban.service";
import type {
  ContractSimulationResult,
  SimulatedContractCall,
  SimulateContractCallRequest,
} from "../types/contractSimulation.types";

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function parseTransaction(transactionXdr: string, networkPassphrase: string): Transaction {
  if (
    typeof transactionXdr !== "string" ||
    transactionXdr.length === 0 ||
    !BASE64_PATTERN.test(transactionXdr) ||
    Buffer.from(transactionXdr, "base64").toString("base64") !== transactionXdr
  ) {
    throw new AppError("transactionXdr must be valid base64 transaction envelope XDR", StatusCodes.BAD_REQUEST, "INVALID_TRANSACTION_XDR");
  }

  try {
    const transaction = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase);
    if (!(transaction instanceof Transaction)) {
      throw new Error("Fee-bump envelopes are not supported for contract simulation");
    }
    return transaction;
  } catch {
    throw new AppError("transactionXdr is not a valid transaction for the configured network", StatusCodes.BAD_REQUEST, "INVALID_TRANSACTION_XDR");
  }
}

function getContractCalls(transaction: Transaction): SimulatedContractCall[] {
  if (transaction.operations.length === 0) {
    throw new AppError("Transaction must contain a contract invocation", StatusCodes.BAD_REQUEST, "CONTRACT_INVOCATION_REQUIRED");
  }

  try {
    return transaction.operations.map((operation) => {
      if (operation.type !== "invokeHostFunction") {
        throw new Error("Only contract invocation operations can be simulated");
      }

      const invocation = operation.func.invokeContract();
      const functionName = invocation.functionName().toString();
      if (!functionName) throw new Error("Contract function name is empty");

      return {
        contractId: Address.fromScAddress(invocation.contractAddress()).toString(),
        functionName,
      };
    });
  } catch {
    throw new AppError("Transaction must contain valid Soroban contract invocation operations", StatusCodes.BAD_REQUEST, "CONTRACT_INVOCATION_REQUIRED");
  }
}

export class ContractSimulationService {
  constructor(
    private readonly soroban: Pick<SorobanService, "simulate" | "networkPassphrase"> = sorobanService
  ) {}

  async simulateContractCall(input: SimulateContractCallRequest): Promise<ContractSimulationResult> {
    const networkPassphrase = this.soroban.networkPassphrase;
    const transaction = parseTransaction(input?.transactionXdr, networkPassphrase);
    const contractCalls = getContractCalls(transaction);
    const simulation = await this.soroban.simulate(transaction);

    if (rpc.Api.isSimulationRestore(simulation)) {
      throw new AppError(
        "Simulation requires restoring archived ledger entries before the contract call can run",
        StatusCodes.UNPROCESSABLE_ENTITY,
        "SOROBAN_RESTORE_REQUIRED"
      );
    }

    const transactionFee = BigInt(transaction.fee);
    const minResourceFee = BigInt(simulation.minResourceFee);
    const inclusionFee = BigInt(BASE_FEE) * BigInt(transaction.operations.length);
    const minimumRequiredFee = inclusionFee + minResourceFee;

    if (transactionFee < minimumRequiredFee) {
      throw new AppError(
        `Transaction fee ${transaction.fee} is below the simulated minimum ${minimumRequiredFee.toString()}`,
        StatusCodes.UNPROCESSABLE_ENTITY,
        "SOROBAN_INSUFFICIENT_FEE"
      );
    }

    if (!simulation.result) {
      throw new AppError(
        "Soroban simulation did not return contract invocation results",
        StatusCodes.BAD_GATEWAY,
        "SOROBAN_SIMULATION_RESULT_MISSING"
      );
    }

    const resources = simulation.transactionData.build().resources();
    const authEntriesXdr = simulation.result.auth.map((entry) => entry.toXDR("base64"));
    const saved = await ContractSimulation.create({
      transactionHash: transaction.hash().toString("hex"),
      networkPassphrase,
      contractCalls,
      transactionFee: transaction.fee,
      minimumRequiredFee: minimumRequiredFee.toString(),
      minResourceFee: simulation.minResourceFee,
      authorizationRequired: authEntriesXdr.length > 0,
      authEntriesXdr,
      cpuInstructions: resources.instructions().toString(),
      readBytes: resources.readBytes().toString(),
      writeBytes: resources.writeBytes().toString(),
      returnValueXdr: simulation.result.retval.toXDR("base64"),
      simulationLedger: simulation.latestLedger,
      eventCount: simulation.events.length,
    });

    return {
      id: saved._id.toString(),
      transactionHash: saved.transactionHash,
      networkPassphrase: saved.networkPassphrase,
      contractCalls: saved.contractCalls.map(({ contractId, functionName }) => ({ contractId, functionName })),
      transactionFee: saved.transactionFee,
      minResourceFee: saved.minResourceFee,
      minimumRequiredFee: saved.minimumRequiredFee,
      authorizationRequired: saved.authorizationRequired,
      authEntriesXdr: saved.authEntriesXdr,
      cost: {
        cpuInstructions: saved.cpuInstructions,
        readBytes: saved.readBytes,
        writeBytes: saved.writeBytes,
      },
      returnValueXdr: saved.returnValueXdr,
      simulationLedger: saved.simulationLedger,
      eventCount: saved.eventCount,
      createdAt: saved.createdAt.toISOString(),
    };
  }
}

export type ContractSimulationServiceType = ContractSimulationService;
export const contractSimulationService = new ContractSimulationService();