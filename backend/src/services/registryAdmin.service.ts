import mongoose from "mongoose";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { RegistryAuditModel } from "../models/RegistryAudit.model";
import {
  RegistryEntryModel,
  type RegistryEntryKind,
} from "../models/RegistryEntry.model";
import { assertHex32 } from "../utils/xdr";
import type { RegistryContract } from "./contracts/RegistryContract";
import type { ContractTransactionResult } from "./contracts/ContractTransactionClient";

type RegistryAction = "add" | "remove";

export interface RegistryAdminStore {
  saveChange(input: {
    kind: RegistryEntryKind;
    value: string;
    action: RegistryAction;
    adminUserId: string;
    result: ContractTransactionResult;
  }): Promise<Record<string, unknown>>;
  list(kind: RegistryEntryKind): Promise<Record<string, unknown>[]>;
}

export const mongooseRegistryAdminStore: RegistryAdminStore = {
  async saveChange({ kind, value, action, adminUserId, result }) {
    const updated = await RegistryEntryModel.findOneAndUpdate(
      { kind, value },
      {
        $set: {
          active: action === "add",
          lastTransactionHash: result.transactionHash,
          ledgerSequence: result.ledgerSequence,
          updatedBy: new mongoose.Types.ObjectId(adminUserId),
        },
        $setOnInsert: { kind, value },
      },
      { new: true, upsert: true }
    );

    const audit = await RegistryAuditModel.create({
      action,
      targetType: kind,
      targetValue: value,
      adminUserId: new mongoose.Types.ObjectId(adminUserId),
      transactionHash: result.transactionHash,
      ledgerSequence: result.ledgerSequence,
    });

    const persisted = await RegistryEntryModel.findById(updated._id).lean<Record<string, unknown>>();
    if (!persisted) {
      throw new AppError(
        "Registry change was submitted but could not be read from the database",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "REGISTRY_PERSISTENCE_FAILED"
      );
    }
    return { ...persisted, auditId: String(audit._id) };
  },

  async list(kind) {
    return RegistryEntryModel.find({ kind, active: true })
      .sort({ value: 1 })
      .lean<Record<string, unknown>[]>();
  },
};

type RegistryMutations = Pick<
  RegistryContract,
  "addTeeHash" | "removeTeeHash" | "addProvider" | "removeProvider"
>;

export class RegistryAdminService {
  constructor(
    private readonly contractFactory: () => RegistryMutations,
    private readonly store: RegistryAdminStore = mongooseRegistryAdminStore
  ) {}

  listTeeHashes() {
    return this.store.list("tee_hash");
  }

  listProviders() {
    return this.store.list("provider");
  }

  addTeeHash(hash: string, adminUserId: string) {
    return this.change("tee_hash", assertHex32(hash, "hash"), "add", adminUserId);
  }

  removeTeeHash(hash: string, adminUserId: string) {
    return this.change("tee_hash", assertHex32(hash, "hash"), "remove", adminUserId);
  }

  addProvider(provider: string, adminUserId: string) {
    return this.change("provider", this.normalizeProvider(provider), "add", adminUserId);
  }

  removeProvider(provider: string, adminUserId: string) {
    return this.change("provider", this.normalizeProvider(provider), "remove", adminUserId);
  }

  private normalizeProvider(provider: string): string {
    if (!StrKey.isValidEd25519PublicKey(provider)) {
      throw new AppError(
        "provider must be a valid Stellar public key",
        StatusCodes.BAD_REQUEST,
        "INVALID_PROVIDER"
      );
    }
    return provider;
  }

  private async change(
    kind: RegistryEntryKind,
    value: string,
    action: RegistryAction,
    adminUserId: string
  ): Promise<Record<string, unknown>> {
    if (!mongoose.Types.ObjectId.isValid(adminUserId)) {
      throw new AppError("Invalid admin user ID", StatusCodes.UNAUTHORIZED, "INVALID_ADMIN");
    }

    const contract = this.contractFactory();
    const result =
      kind === "tee_hash"
        ? await contract[action === "add" ? "addTeeHash" : "removeTeeHash"](value)
        : await contract[action === "add" ? "addProvider" : "removeProvider"](value);

    return this.store.saveChange({ kind, value, action, adminUserId, result });
  }
}

function createRegistryContract(): RegistryContract {
  // Load runtime configuration lazily so read-only registry endpoints and
  // service unit tests do not require an admin signing key.
  const { env } = require("../config/env") as typeof import("../config/env");
  const { RegistryContract } = require("./contracts/RegistryContract") as typeof import("./contracts/RegistryContract");
  const { SorobanContractTransactionClient } = require("./contracts/ContractTransactionClient") as typeof import("./contracts/ContractTransactionClient");

  if (!StrKey.isValidEd25519SecretSeed(env.STELLAR_REGISTRY_ADMIN_SECRET_KEY)) {
    throw new AppError(
      "STELLAR_REGISTRY_ADMIN_SECRET_KEY must be a valid Stellar secret seed",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "REGISTRY_CONFIG_INVALID"
    );
  }
  return new RegistryContract(
    env.STELLAR_REGISTRY_CONTRACT_ID,
    Keypair.fromSecret(env.STELLAR_REGISTRY_ADMIN_SECRET_KEY),
    new SorobanContractTransactionClient()
  );
}

export const registryAdminService = new RegistryAdminService(createRegistryContract);
