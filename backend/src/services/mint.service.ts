import mongoose from "mongoose";
import { Keypair, Networks, StrKey } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import Asset from "../models/Asset.model";
import Certificate from "../models/Certificate.model";
import Manifest from "../models/Manifest.model";
import { VerificationJobModel } from "../models/verificationJob.model";
import { VerificationStatus } from "../types/verification.types";
import type { MintArgs } from "../utils/xdr";
import type {
  ProvenanceContract,
  MintConfirmation,
  PreparedMint,
} from "./contracts/ProvenanceContract";

export interface MintJobContext {
  jobId: string;
  assetId: string;
  manifestId: string;
  creatorId: string;
  ownerPublicKey: string;
  mediaCid: string;
  manifestHash: string;
  attestationHash: string;
  transactionHash?: string;
}

export interface MintStore {
  findCached(jobId: string): Promise<Record<string, unknown> | null>;
  loadContext(jobId: string): Promise<MintJobContext>;
  recordTransaction(jobId: string, transactionHash: string): Promise<void>;
  complete(
    context: MintJobContext,
    confirmation: MintConfirmation,
    config: { contractAddress: string; stellarNetwork: "testnet" | "mainnet" }
  ): Promise<Record<string, unknown>>;
  ensureJobCompleted(jobId: string, cached: Record<string, unknown>): Promise<void>;
}

export const mongooseMintStore: MintStore = {
  async findCached(jobId) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new AppError("Invalid verification job ID", 400, "INVALID_JOB_ID");
    }
    return Certificate.findOne({ verificationJobId: jobId }).lean<Record<string, unknown>>();
  },

  async loadContext(jobId) {
    const job = await VerificationJobModel.findById(jobId).lean();
    if (!job) throw new AppError("Verification job not found", 404, "JOB_NOT_FOUND");
    if (job.status !== VerificationStatus.MINTING) {
      throw new AppError(
        `Verification job must be in '${VerificationStatus.MINTING}' state`,
        StatusCodes.CONFLICT,
        "JOB_NOT_READY_TO_MINT"
      );
    }
    if (!job.assetId || !job.manifestId || !job.teeAttestationHash) {
      throw new AppError(
        "Verification job is missing asset, manifest, or attestation data",
        StatusCodes.CONFLICT,
        "MINT_JOB_DATA_MISSING"
      );
    }

    const [asset, manifest] = await Promise.all([
      Asset.findById(job.assetId).lean(),
      Manifest.findById(job.manifestId).lean(),
    ]);
    if (!asset || !manifest) {
      throw new AppError(
        "Verification job references missing asset or manifest data",
        StatusCodes.CONFLICT,
        "MINT_SOURCE_NOT_FOUND"
      );
    }
    if (!manifest.manifestHash) {
      throw new AppError("Manifest hash is missing", 409, "MANIFEST_HASH_MISSING");
    }

    return {
      jobId,
      assetId: String(asset._id),
      manifestId: String(manifest._id),
      creatorId: String(manifest.creatorId),
      ownerPublicKey: job.ownerPublicKey,
      mediaCid: asset.storageReferenceId,
      manifestHash: manifest.manifestHash,
      attestationHash: job.teeAttestationHash,
      ...(job.stellarTransactionHash
        ? { transactionHash: job.stellarTransactionHash }
        : {}),
    };
  },

  async recordTransaction(jobId, transactionHash) {
    const result = await VerificationJobModel.updateOne(
      { _id: jobId, status: VerificationStatus.MINTING },
      { $set: { stellarTransactionHash: transactionHash } }
    );
    if (result.matchedCount !== 1) {
      throw new AppError("Minting job changed before submission", 409, "MINT_JOB_CONFLICT");
    }
  },

  async complete(context, confirmation, config) {
    const certificate = await Certificate.findOneAndUpdate(
      { verificationJobId: context.jobId },
      {
        $setOnInsert: {
          verificationJobId: new mongoose.Types.ObjectId(context.jobId),
          assetId: new mongoose.Types.ObjectId(context.assetId),
          manifestId: new mongoose.Types.ObjectId(context.manifestId),
          creatorId: new mongoose.Types.ObjectId(context.creatorId),
          stellarNetwork: config.stellarNetwork,
          contractAddress: config.contractAddress,
          certificateId: confirmation.certificateId,
          transactionHash: confirmation.transactionHash,
          ledgerSequence: confirmation.ledgerSequence,
          mintedAt: confirmation.mintedAt,
        },
      },
      { new: true, upsert: true }
    );

    await VerificationJobModel.updateOne(
      { _id: context.jobId },
      {
        $set: {
          status: VerificationStatus.COMPLETED,
          stellarTransactionHash: confirmation.transactionHash,
          certificateId: confirmation.certificateId,
        },
      }
    );

    const persisted = await Certificate.findById(certificate._id).lean<Record<string, unknown>>();
    if (!persisted) {
      throw new AppError(
        "Certificate was minted but cache retrieval failed",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "CERTIFICATE_CACHE_FAILED"
      );
    }
    return persisted;
  },

  async ensureJobCompleted(jobId, cached) {
    await VerificationJobModel.updateOne(
      { _id: jobId, status: { $ne: VerificationStatus.COMPLETED } },
      {
        $set: {
          status: VerificationStatus.COMPLETED,
          stellarTransactionHash: cached.transactionHash,
          certificateId: cached.certificateId,
        },
      }
    );
  },
};

type ProvenanceMintClient = Pick<
  ProvenanceContract,
  "prepareMint" | "submit" | "confirm"
>;

export class MintService {
  constructor(
    private readonly contractFactory: () => ProvenanceMintClient,
    private readonly contractAddress: string,
    private readonly stellarNetwork: "testnet" | "mainnet",
    private readonly store: MintStore = mongooseMintStore
  ) {}

  async mintForJob(jobId: string): Promise<Record<string, unknown>> {
    const cached = await this.store.findCached(jobId);
    if (cached) {
      await this.store.ensureJobCompleted(jobId, cached);
      return cached;
    }

    const context = await this.store.loadContext(jobId);
    const contract = this.contractFactory();
    let transactionHash = context.transactionHash;
    let prepared: PreparedMint | undefined;

    if (!transactionHash) {
      const args: MintArgs = {
        to: context.ownerPublicKey,
        mediaCid: context.mediaCid,
        manifestHash: context.manifestHash,
        attestationHash: context.attestationHash,
      };
      prepared = await contract.prepareMint(args);
      transactionHash = prepared.transactionHash;
      await this.store.recordTransaction(jobId, transactionHash);
      await contract.submit(prepared);
    }

    const confirmation = await contract.confirm(transactionHash);
    return this.store.complete(context, confirmation, {
      contractAddress: this.contractAddress,
      stellarNetwork: this.stellarNetwork,
    });
  }
}

function runtimeConfig() {
  const { env } = require("../config/env") as typeof import("../config/env");
  if (!StrKey.isValidEd25519SecretSeed(env.STELLAR_ORACLE_SECRET_KEY)) {
    throw new AppError(
      "STELLAR_ORACLE_SECRET_KEY must be a valid Stellar secret seed",
      500,
      "PROVENANCE_CONFIG_INVALID"
    );
  }
  if (!StrKey.isValidContract(env.STELLAR_PROVENANCE_CONTRACT_ID)) {
    throw new AppError(
      "STELLAR_PROVENANCE_CONTRACT_ID must be a valid contract address",
      500,
      "PROVENANCE_CONFIG_INVALID"
    );
  }
  return {
    contractAddress: env.STELLAR_PROVENANCE_CONTRACT_ID,
    stellarNetwork: env.STELLAR_NETWORK_PASSPHRASE === Networks.PUBLIC ? "mainnet" as const : "testnet" as const,
    signer: Keypair.fromSecret(env.STELLAR_ORACLE_SECRET_KEY),
    confirmationTimeoutMs: env.STELLAR_TX_CONFIRMATION_TIMEOUT_MS,
  };
}

let configuredService: MintService | undefined;
export function getMintService(): MintService {
  if (configuredService) return configuredService;
  const config = runtimeConfig();
  const { ProvenanceContract } = require("./contracts/ProvenanceContract") as typeof import("./contracts/ProvenanceContract");
  configuredService = new MintService(
    () => new ProvenanceContract(
      config.contractAddress,
      config.signer,
      undefined,
      config.confirmationTimeoutMs
    ),
    config.contractAddress,
    config.stellarNetwork,
    mongooseMintStore
  );
  return configuredService;
}

export const mintService = {
  mintForJob(jobId: string) {
    return getMintService().mintForJob(jobId);
  },
};
