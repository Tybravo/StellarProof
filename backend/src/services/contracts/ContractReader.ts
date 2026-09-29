import { rpc, type xdr } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/AppError";
import type { SorobanService } from "../soroban.service";
import type { ContractCall } from "../../utils/transactionBuilder";

export interface ContractQueryClient {
  invoke(call: ContractCall): Promise<xdr.ScVal>;
}

/**
 * Simulates read-only Soroban invocations through the shared RPC service.
 * The caller supplies a funded account because Soroban simulations still
 * require a transaction source even though no transaction is submitted.
 */
export class SorobanContractQueryClient implements ContractQueryClient {
  private readonly soroban: Pick<
    SorobanService,
    "loadAccount" | "simulate" | "networkPassphrase"
  >;

  constructor(
    private readonly sourceAccount: string,
    soroban?: Pick<
      SorobanService,
      "loadAccount" | "simulate" | "networkPassphrase"
    >
  ) {
    this.soroban = soroban ?? (require("../soroban.service") as typeof import("../soroban.service")).sorobanService;
  }

  async invoke(call: ContractCall): Promise<xdr.ScVal> {
    const { buildContractCallTransaction } = require("../../utils/transactionBuilder") as typeof import("../../utils/transactionBuilder");
    const source = await this.soroban.loadAccount(this.sourceAccount);
    const transaction = buildContractCallTransaction(
      source,
      call,
      this.soroban.networkPassphrase
    );
    const simulation = await this.soroban.simulate(transaction);

    if (rpc.Api.isSimulationRestore(simulation)) {
      throw new AppError(
        `Contract query '${call.method}' requires archived ledger restoration`,
        StatusCodes.CONFLICT,
        "CONTRACT_QUERY_RESTORE_REQUIRED"
      );
    }

    if (!simulation.result) {
      throw new AppError(
        `Contract query '${call.method}' returned no value`,
        StatusCodes.BAD_GATEWAY,
        "CONTRACT_QUERY_EMPTY_RESULT"
      );
    }

    return simulation.result.retval;
  }
}
