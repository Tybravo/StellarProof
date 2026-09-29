import { scValToNative, StrKey } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/AppError";
import { toAddressScVal } from "../../utils/xdr";
import type { ContractQueryClient } from "./ContractReader";

export class OracleContract {
  constructor(
    private readonly contractId: string,
    private readonly client: ContractQueryClient
  ) {
    if (!StrKey.isValidContract(contractId)) {
      throw new AppError(
        "STELLAR_ORACLE_CONTRACT_ID must be a valid contract address",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "ORACLE_CONTRACT_CONFIG_INVALID"
      );
    }
  }

  async isProvider(providerPublicKey: string): Promise<boolean> {
    const result = await this.client.invoke({
      contractId: this.contractId,
      method: "is_provider",
      args: [toAddressScVal(providerPublicKey, "provider")],
    });

    const value: unknown = scValToNative(result);
    if (typeof value !== "boolean") {
      throw new AppError(
        "Oracle is_provider returned an invalid response",
        StatusCodes.BAD_GATEWAY,
        "ORACLE_INVALID_RESPONSE"
      );
    }
    return value;
  }
}
