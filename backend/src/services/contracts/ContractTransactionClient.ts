import { StatusCodes } from "http-status-codes";
import { Keypair } from "@stellar/stellar-sdk";
import { AppError } from "../../errors/AppError";
import type { SorobanService } from "../soroban.service";
import type { ContractCall } from "../../utils/transactionBuilder";

export interface ContractTransactionResult {
  transactionHash: string;
  ledgerSequence: number;
}

export interface ContractTransactionClient {
  submit(call: ContractCall, signer: Keypair): Promise<ContractTransactionResult>;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class SorobanContractTransactionClient implements ContractTransactionClient {
  private readonly soroban: Pick<
    SorobanService,
    | "loadAccount"
    | "simulate"
    | "sendTransaction"
    | "getTransaction"
    | "networkPassphrase"
  >;

  constructor(
    soroban?: Pick<
      SorobanService,
      | "loadAccount"
      | "simulate"
      | "sendTransaction"
      | "getTransaction"
      | "networkPassphrase"
    >,
    private readonly confirmationTimeoutMs = 120_000,
    private readonly pollIntervalMs = 1_000
  ) {
    this.soroban = soroban ?? (require("../soroban.service") as typeof import("../soroban.service")).sorobanService;
  }

  async submit(call: ContractCall, signer: Keypair): Promise<ContractTransactionResult> {
    const { buildSignedContractTransaction } = require("../../utils/transactionBuilder") as typeof import("../../utils/transactionBuilder");
    const signed = await buildSignedContractTransaction({
      client: {
        getAccount: (address) => this.soroban.loadAccount(address),
        simulateTransaction: (transaction) => this.soroban.simulate(transaction),
      },
      keypair: signer,
      networkPassphrase: this.soroban.networkPassphrase,
      call,
    });

    await this.soroban.sendTransaction(signed.transaction);
    const deadline = Date.now() + this.confirmationTimeoutMs;

    while (Date.now() < deadline) {
      const result = await this.soroban.getTransaction(signed.hash);
      if (result.status === "SUCCESS") {
        return { transactionHash: signed.hash, ledgerSequence: result.ledger };
      }
      if (result.status === "FAILED") {
        throw new AppError(
          `Registry transaction ${signed.hash} failed on-chain`,
          StatusCodes.UNPROCESSABLE_ENTITY,
          "REGISTRY_TRANSACTION_FAILED"
        );
      }
      await delay(this.pollIntervalMs);
    }

    throw new AppError(
      `Timed out confirming registry transaction ${signed.hash}`,
      StatusCodes.GATEWAY_TIMEOUT,
      "REGISTRY_CONFIRMATION_TIMEOUT"
    );
  }
}
