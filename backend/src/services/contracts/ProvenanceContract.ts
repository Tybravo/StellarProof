import {
  Keypair,
  scValToNative,
  StrKey,
  type Transaction,
} from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../../errors/AppError";
import type { SorobanService } from "../soroban.service";
import { buildMintArgs, toU64ScVal, type MintArgs } from "../../utils/xdr";
import type { ContractQueryClient } from "./ContractReader";

export interface PreparedMint {
  transactionHash: string;
  transaction: Transaction;
}

export interface ProvenanceCertificate {
  storageId: string;
  manifestHash: string;
  attestationHash: string;
  creator: string;
  timestamp: string;
}

export interface MintConfirmation {
  transactionHash: string;
  certificateId: string;
  ledgerSequence: number;
  mintedAt: Date;
}

/** On-chain `Certificate` returned by `provenance.get_certificate`. */
export interface OnChainCertificate {
  storageId: string;
  manifestHash: string;
  attestationHash: string;
  creator: string;
  timestamp: Date;
}

/** Soroban RPC surface required to sign and submit provenance mutations. */
export type ProvenanceSorobanClient = Pick<
  SorobanService,
  | "loadAccount"
  | "simulate"
  | "sendTransaction"
  | "getTransaction"
  | "networkPassphrase"
>;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const CERTIFICATE_ID_PATTERN = /^\d+$/;

export class ProvenanceContract {
  private readonly contractId: string;
  private readonly soroban?: ProvenanceSorobanClient;
  private readonly signer?: Keypair;
  private readonly queryClient?: ContractQueryClient;
  private readonly confirmationTimeoutMs: number;
  private readonly pollIntervalMs: number;

  /** Read-only client used to simulate `get_certificate` queries. */
  constructor(contractId: string, client: ContractQueryClient);
  /** Mutation client used to `mint` certificates. */
  constructor(
    contractId: string,
    signer: Keypair,
    soroban?: ProvenanceSorobanClient,
    confirmationTimeoutMs?: number,
    pollIntervalMs?: number
  );
  constructor(
    contractId: string,
    clientOrSigner: ContractQueryClient | Keypair,
    soroban?: Pick<
      SorobanService,
      | "loadAccount"
      | "simulate"
      | "sendTransaction"
      | "getTransaction"
      | "networkPassphrase"
    >,
    confirmationTimeoutMs = 120_000,
    pollIntervalMs = 1_000,
  ) {
    if (!StrKey.isValidContract(contractId)) {
      throw new AppError(
        "STELLAR_PROVENANCE_CONTRACT_ID must be a valid contract address",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "PROVENANCE_CONFIG_INVALID"
      );
    }

    this.contractId = contractId;
    this.confirmationTimeoutMs = confirmationTimeoutMs;
    this.pollIntervalMs = pollIntervalMs;

    if ("invoke" in clientOrSigner) {
      this.queryClient = clientOrSigner;
    } else {
      this.signer = clientOrSigner;
      this.soroban =
        soroban ??
        (require("../soroban.service") as typeof import("../soroban.service")).sorobanService;
    }
  }

  /**
   * Reads a certificate from ledger storage via `get_certificate`.
   *
   * Returns `null` when the contract reports the certificate does not exist
   * so callers can distinguish "not found" from transport failures.
   */
  async getCertificate(certificateId: string): Promise<OnChainCertificate | null> {
    if (!this.queryClient) {
      throw new AppError(
        "Provenance query client is not configured",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "PROVENANCE_QUERY_NOT_CONFIGURED"
      );
    }

    if (!CERTIFICATE_ID_PATTERN.test(certificateId)) {
      throw new AppError(
        "certificateId must be a non-negative numeric identifier",
        StatusCodes.BAD_REQUEST,
        "INVALID_CERTIFICATE_ID"
      );
    }

    try {
      const result = await this.queryClient.invoke({
        contractId: this.contractId,
        method: "get_certificate",
        args: [toU64ScVal(BigInt(certificateId), "certificateId")],
      });

      const native: unknown = scValToNative(result);
      if (native === null || native === undefined) {
        return null;
      }
      return this.parseCertificate(native);
    } catch (error) {
      // A read-only `get_certificate` that fails during simulation means the
      // contract returned `Err(CertificateNotFound)`; report it as absent so
      // the caller can return `valid: false` rather than a 5xx.
      if (
        error instanceof AppError &&
        error.code === "SOROBAN_SIMULATION_FAILED"
      ) {
        return null;
      }
      throw error;
    }
  }

  private parseCertificate(native: unknown): OnChainCertificate {
    const record =
      native instanceof Map ? Object.fromEntries(native) : native;

    if (typeof record !== "object" || record === null) {
      throw new AppError(
        "Provenance get_certificate returned an invalid response",
        StatusCodes.BAD_GATEWAY,
        "PROVENANCE_INVALID_RESPONSE"
      );
    }

    const { storage_id, manifest_hash, attestation_hash, creator, timestamp } =
      record as Record<string, unknown>;

    if (
      typeof storage_id !== "string" ||
      typeof manifest_hash !== "string" ||
      typeof attestation_hash !== "string" ||
      typeof creator !== "string" ||
      (typeof timestamp !== "bigint" && typeof timestamp !== "number")
    ) {
      throw new AppError(
        "Provenance get_certificate returned an invalid certificate shape",
        StatusCodes.BAD_GATEWAY,
        "PROVENANCE_INVALID_RESPONSE"
      );
    }

    return {
      storageId: storage_id,
      manifestHash: manifest_hash,
      attestationHash: attestation_hash,
      creator,
      timestamp: new Date(Number(timestamp) * 1_000),
    };
  }

  async confirm(transactionHash: string): Promise<MintConfirmation> {
    const soroban = this.requireMutationClient();
    const deadline = Date.now() + this.confirmationTimeoutMs;
    while (Date.now() < deadline) {
      const result = await soroban.getTransaction(transactionHash);
      if (result.status === "SUCCESS") {
        if (!result.returnValue) {
          throw new AppError(
            "Provenance mint returned no certificate ID",
            StatusCodes.BAD_GATEWAY,
            "MINT_RESULT_MISSING"
          );
        }
        const certificateId = scValToNative(result.returnValue);
        if (typeof certificateId !== "bigint" && typeof certificateId !== "number") {
          throw new AppError(
            "Provenance mint returned an invalid certificate ID",
            StatusCodes.BAD_GATEWAY,
            "MINT_RESULT_INVALID"
          );
        }
        return {
          transactionHash,
          certificateId: String(certificateId),
          ledgerSequence: result.ledger,
          mintedAt: new Date(result.createdAt * 1_000),
        };
      }
      if (result.status === "FAILED") {
        throw new AppError(
          `Provenance mint transaction ${transactionHash} failed on-chain`,
          StatusCodes.UNPROCESSABLE_ENTITY,
          "MINT_TRANSACTION_FAILED"
        );
      }
      await wait(this.pollIntervalMs);
    }

    throw new AppError(
      `Timed out confirming mint transaction ${transactionHash}`,
      StatusCodes.GATEWAY_TIMEOUT,
      "MINT_CONFIRMATION_TIMEOUT"
    );
  }

  async prepareMint(input: MintArgs): Promise<PreparedMint> {
    const soroban = this.requireMutationClient();
    const signer = this.signer as Keypair;
    // Mock implementation
    return {
      transactionHash: 'mock-hash',
      transaction: {} as any
    };
  }

  async submit(prepared: PreparedMint): Promise<void> {
    await this.requireMutationClient().sendTransaction(prepared.transaction);
  }

  private requireMutationClient(): ProvenanceSorobanClient {
    if (!this.soroban || !this.signer) {
      throw new AppError(
        "Provenance transaction client is not configured",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "PROVENANCE_MUTATION_NOT_CONFIGURED"
      );
    }
    return this.soroban;
  }
}
