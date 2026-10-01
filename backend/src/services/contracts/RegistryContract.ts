import { Keypair, scValToNative, StrKey } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/AppError";
import { toBytesN32ScVal } from "../../utils/xdr";
import type { ContractQueryClient } from "./ContractReader";
import type {
  ContractTransactionClient,
  ContractTransactionResult,
} from "./ContractTransactionClient";

export class RegistryContract {
  private readonly queryClient?: ContractQueryClient;
  private readonly signer?: Keypair;
  private readonly transactionClient?: ContractTransactionClient;

  constructor(contractId: string, client: ContractQueryClient);
  constructor(
    contractId: string,
    signer: Keypair,
    client: ContractTransactionClient
  );
  constructor(
    private readonly contractId: string,
    clientOrSigner: ContractQueryClient | Keypair,
    transactionClient?: ContractTransactionClient
  ) {
    if (!StrKey.isValidContract(contractId)) {
      throw new AppError(
        "STELLAR_REGISTRY_CONTRACT_ID must be a valid contract address",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "REGISTRY_CONFIG_INVALID"
      );
    }

    if ("invoke" in clientOrSigner) {
      this.queryClient = clientOrSigner;
    } else {
      this.signer = clientOrSigner;
      this.transactionClient = transactionClient;
    }
  }

  async isVerified(teeHash: string, providerPublicKey: string): Promise<boolean> {
    const result = await this.requireQueryClient().invoke({
      contractId: this.contractId,
      method: "is_verified",
      args: [
        toBytesN32ScVal(teeHash, "teeHash"),
        this.providerArg(providerPublicKey),
      ],
    });

    const value: unknown = scValToNative(result);
    if (typeof value !== "boolean") {
      throw new AppError(
        "Registry is_verified returned an invalid response",
        StatusCodes.BAD_GATEWAY,
        "REGISTRY_INVALID_RESPONSE"
      );
    }
    return value;
  }

  async hasTeeHash(hash: string): Promise<boolean> {
    const result = await this.requireQueryClient().invoke({
      contractId: this.contractId,
      method: "has_tee_hash",
      args: [toBytesN32ScVal(hash, "hash")],
    });
    const value: unknown = scValToNative(result);
    if (typeof value !== "boolean") {
      throw new AppError(
        "Registry has_tee_hash returned an invalid response",
        StatusCodes.BAD_GATEWAY,
        "REGISTRY_INVALID_RESPONSE"
      );
    }
    return value;
  }

  async isHashVerified(hash: string): Promise<boolean> {
    const result = await this.requireQueryClient().invoke({
      contractId: this.contractId,
      method: "is_hash_verified",
      args: [toBytesN32ScVal(hash, "hash")],
    });
    const value: unknown = scValToNative(result);
    if (typeof value !== "boolean") {
      throw new AppError(
        "Registry is_hash_verified returned an invalid response",
        StatusCodes.BAD_GATEWAY,
        "REGISTRY_INVALID_RESPONSE"
      );
    }
    return value;
  }

  addTeeHash(hash: string): Promise<ContractTransactionResult> {
    return this.invokeMutation("add_tee_hash", toBytesN32ScVal(hash, "hash"));
  }

  removeTeeHash(hash: string): Promise<ContractTransactionResult> {
    return this.invokeMutation("remove_tee_hash", toBytesN32ScVal(hash, "hash"));
  }

  addProvider(providerPublicKey: string): Promise<ContractTransactionResult> {
    return this.invokeMutation("add_provider", this.providerArg(providerPublicKey));
  }

  removeProvider(providerPublicKey: string): Promise<ContractTransactionResult> {
    return this.invokeMutation("remove_provider", this.providerArg(providerPublicKey));
  }

  private requireQueryClient(): ContractQueryClient {
    if (!this.queryClient) {
      throw new AppError(
        "Registry query client is not configured",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "REGISTRY_QUERY_NOT_CONFIGURED"
      );
    }
    return this.queryClient;
  }

  private providerArg(providerPublicKey: string) {
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

  private invokeMutation(
    method: string,
    arg: ReturnType<typeof toBytesN32ScVal>
  ): Promise<ContractTransactionResult> {
    if (!this.signer || !this.transactionClient) {
      throw new AppError(
        "Registry transaction signer is not configured",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "REGISTRY_MUTATION_NOT_CONFIGURED"
      );
    }
    return this.transactionClient.submit(
      { contractId: this.contractId, method, args: [arg] },
      this.signer
    );
  }
}
