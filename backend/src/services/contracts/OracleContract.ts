import { Keypair, scValToNative, StrKey, xdr } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/AppError";
import { buildSubmitRequestArgs, toBytesN32ScVal } from "../../utils/xdr";
import type { ContractQueryClient } from "./ContractReader";
import type {
  ContractTransactionClient,
  ContractTransactionResult,
} from "./ContractTransactionClient";

export interface SubmittedVerificationRequest extends ContractTransactionResult {
  requestId: string;
}

export class OracleContract {
  private readonly queryClient?: ContractQueryClient;
  private readonly signer?: Keypair;
  private readonly transactionClient?: ContractTransactionClient;

  constructor(contractId: string, client: ContractQueryClient);
  constructor(contractId: string, signer: Keypair, client: ContractTransactionClient);
  constructor(
    private readonly contractId: string,
    clientOrSigner: ContractQueryClient | Keypair,
    transactionClient?: ContractTransactionClient
  ) {
    if (!StrKey.isValidContract(contractId)) {
      throw new AppError(
        "STELLAR_ORACLE_CONTRACT_ID must be a valid contract address",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "ORACLE_CONTRACT_CONFIG_INVALID"
      );
    }

    if ("invoke" in clientOrSigner) {
      this.queryClient = clientOrSigner;
    } else {
      this.signer = clientOrSigner;
      this.transactionClient = transactionClient;
    }
  }

  async isProvider(providerPublicKey: string): Promise<boolean> {
    const result = await this.requireQueryClient().invoke({
      contractId: this.contractId,
      method: "is_provider",
      args: [this.providerArg(providerPublicKey)],
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

  async submitRequest(contentHash: string): Promise<SubmittedVerificationRequest> {
    const result = await this.invokeMutation("submit_request", buildSubmitRequestArgs({ contentHash }));
    if (!result.returnValue) {
      throw new AppError(
        "Oracle submit_request returned no request ID",
        StatusCodes.BAD_GATEWAY,
        "ORACLE_REQUEST_ID_MISSING"
      );
    }

    const requestId = scValToNative(result.returnValue);
    if (typeof requestId !== "bigint" && typeof requestId !== "number") {
      throw new AppError(
        "Oracle submit_request returned an invalid request ID",
        StatusCodes.BAD_GATEWAY,
        "ORACLE_REQUEST_ID_INVALID"
      );
    }
    return { ...result, requestId: String(requestId) };
  }

  verifyAttestation(input: {
    providerPublicKey: string;
    teeHash: string;
    payload: Uint8Array;
    signature: Uint8Array;
  }): Promise<ContractTransactionResult> {
    if (input.payload.length === 0) {
      throw new AppError("payload must not be empty", StatusCodes.BAD_REQUEST, "INVALID_ATTESTATION_PAYLOAD");
    }
    if (input.signature.length !== 64) {
      throw new AppError("signature must be exactly 64 bytes", StatusCodes.BAD_REQUEST, "INVALID_ATTESTATION_SIGNATURE");
    }

    return this.invokeMutation("verify_attestation", [
      this.providerArg(input.providerPublicKey),
      toBytesN32ScVal(input.teeHash, "teeHash"),
      xdr.ScVal.scvBytes(Buffer.from(input.payload)),
      xdr.ScVal.scvBytes(Buffer.from(input.signature)),
    ]);
  }

  private providerArg(providerPublicKey: string): xdr.ScVal {
    if (!StrKey.isValidEd25519PublicKey(providerPublicKey)) {
      throw new AppError(
        "provider must be a valid Stellar public key",
        StatusCodes.BAD_REQUEST,
        "INVALID_PROVIDER"
      );
    }
    return toBytesN32ScVal(
      Buffer.from(StrKey.decodeEd25519PublicKey(providerPublicKey)).toString("hex"),
      "provider"
    );
  }

  private requireQueryClient(): ContractQueryClient {
    if (!this.queryClient) {
      throw new AppError(
        "Oracle query client is not configured",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "ORACLE_QUERY_NOT_CONFIGURED"
      );
    }
    return this.queryClient;
  }

  private invokeMutation(
    method: string,
    args: xdr.ScVal[]
  ): Promise<ContractTransactionResult> {
    if (!this.signer || !this.transactionClient) {
      throw new AppError(
        "Oracle transaction signer is not configured",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "ORACLE_MUTATION_NOT_CONFIGURED"
      );
    }
    return this.transactionClient.submit(
      { contractId: this.contractId, method, args },
      this.signer
    );
  }
}
