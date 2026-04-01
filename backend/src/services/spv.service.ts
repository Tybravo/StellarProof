/**
 * SPV Service – Business logic for creating, fetching, and gated decryption
 * of SPV (Stellar Proof Verification) records.
 *
 * NFT-gated decryption flow (accessType === 'nft_holders_only'):
 *   1. Load the SPV record from MongoDB.
 *   2. Call checkNFTOwnership() which simulates a `balance` call against
 *      the Soroban NFT contract via the Stellar RPC.
 *   3. Allow decryption only if the requester's on-chain balance > 0.
 *
 * No hardcoded RPC URLs, network passphrases, or contract addresses –
 * all configuration is sourced from environment variables via env.ts.
 */
import mongoose from "mongoose";
import {
  SorobanRpc,
  Contract,
  Address,
  TransactionBuilder,
  BASE_FEE,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env";
import { SPVModel } from "../models/spv.model";
import { AppError } from "../errors/AppError";
import type {
  ISPVRecord,
  CreateSPVRecordDTO,
  NFTOwnershipResult,
} from "../types/spv.types";

// ---------------------------------------------------------------------------
// Stellar RPC client – instantiated once at module load.
// ---------------------------------------------------------------------------
const rpcServer = new SorobanRpc.Server(env.STELLAR_RPC_URL, {
  allowHttp: env.NODE_ENV !== "production",
});

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Validates that the given string is a valid MongoDB ObjectId.
 */
function assertValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(
      `Invalid record ID: '${id}'`,
      StatusCodes.BAD_REQUEST,
      "INVALID_ID"
    );
  }
}

/**
 * Checks whether `stellarPublicKey` holds any tokens in the Soroban NFT
 * contract at `nftContractAddress` by simulating a read-only `balance` call.
 *
 * Uses `SorobanRpc.Server.simulateTransaction` so no XLM is spent and no
 * transaction is broadcast to the network.
 *
 * Returns `{ holdsToken: false, balance: '0' }` for any of:
 *  - Account does not exist on-chain (unfunded).
 *  - Contract simulation returns an error (wrong contract, bad address, etc.).
 *  - Any unexpected RPC error (treated conservatively as "no access").
 *
 * Only throws AppError (502) when the RPC is unreachable / returns a
 * fatal network-level error that should surface to the caller.
 */
async function checkNFTOwnership(
  stellarPublicKey: string,
  nftContractAddress: string
): Promise<NFTOwnershipResult> {
  try {
    // 1. Fetch the account from Horizon so we can build a valid transaction.
    //    Throws if the account has never been funded (not found on-chain).
    const account = await rpcServer.getAccount(stellarPublicKey);

    // 2. Build the Address ScVal for the requester's public key.
    const ownerAddress = new Address(stellarPublicKey);
    const ownerScVal = ownerAddress.toScVal();

    // 3. Instantiate the contract and build the call operation.
    const contract = new Contract(nftContractAddress);
    const operation = contract.call(env.STELLAR_NFT_BALANCE_FN, ownerScVal);

    // 4. Wrap in a transaction (needed for simulation; never submitted).
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // 5. Simulate the transaction via the Soroban RPC.
    const simResult = await rpcServer.simulateTransaction(tx);

    // 6. A simulation error means the contract rejected the call
    //    (e.g. the address has never interacted with it) – no ownership.
    if (SorobanRpc.Api.isSimulationError(simResult)) {
      console.warn(
        "[SPVService] NFT contract simulation error for %s on %s: %s",
        stellarPublicKey,
        nftContractAddress,
        simResult.error
      );
      return { holdsToken: false, balance: "0" };
    }

    if (!SorobanRpc.Api.isSimulationSuccess(simResult)) {
      return { holdsToken: false, balance: "0" };
    }

    // 7. Extract the return value and parse it as a bigint balance.
    const retval: xdr.ScVal | undefined = simResult.result?.retval;
    if (!retval) {
      return { holdsToken: false, balance: "0" };
    }

    const rawBalance = scValToNative(retval) as bigint | number | undefined;
    const balance: bigint =
      typeof rawBalance === "bigint"
        ? rawBalance
        : typeof rawBalance === "number"
          ? BigInt(rawBalance)
          : 0n;

    return {
      holdsToken: balance > 0n,
      balance: balance.toString(),
    };
  } catch (err: unknown) {
    // Account not found on Horizon → treat as no ownership.
    if (
      err instanceof Error &&
      (err.message.includes("Not Found") ||
        err.message.includes("404") ||
        err.message.includes("account not found"))
    ) {
      return { holdsToken: false, balance: "0" };
    }

    // RPC unreachable or fatal network error → propagate as 502.
    console.error("[SPVService] NFT ownership check failed:", err);
    throw new AppError(
      "Failed to verify NFT ownership via Stellar RPC. Please try again.",
      StatusCodes.BAD_GATEWAY,
      "STELLAR_RPC_ERROR"
    );
  }
}

// ---------------------------------------------------------------------------
// Public service methods
// ---------------------------------------------------------------------------

/**
 * Persists a new SPV record.
 *
 * @throws {AppError} 400 – if `nftContractAddress` is absent when required.
 * @throws {AppError} 409 – if a record with the same `contentHash` exists.
 */
async function createSPVRecord(dto: CreateSPVRecordDTO): Promise<ISPVRecord> {
  if (dto.accessType === "nft_holders_only" && !dto.nftContractAddress) {
    throw new AppError(
      "nftContractAddress is required when accessType is 'nft_holders_only'",
      StatusCodes.BAD_REQUEST,
      "MISSING_NFT_CONTRACT"
    );
  }

  const existing = await SPVModel.findOne({ contentHash: dto.contentHash });
  if (existing) {
    throw new AppError(
      "A record with this contentHash already exists",
      StatusCodes.CONFLICT,
      "DUPLICATE_CONTENT_HASH"
    );
  }

  const record = await SPVModel.create(dto);
  return record.toObject<ISPVRecord>();
}

/**
 * Retrieves a single SPV record by MongoDB ObjectId.
 *
 * @throws {AppError} 400 – if `id` is not a valid ObjectId.
 * @throws {AppError} 404 – if no record exists for the given `id`.
 */
async function getSPVRecord(id: string): Promise<ISPVRecord> {
  assertValidObjectId(id);

  const record = await SPVModel.findById(id).lean<ISPVRecord>();
  if (!record) {
    throw new AppError(
      `SPV record not found: '${id}'`,
      StatusCodes.NOT_FOUND,
      "RECORD_NOT_FOUND"
    );
  }

  return record;
}

/**
 * Decrypts (returns the `encryptedPayload` of) an SPV record after performing
 * access-control checks appropriate to the record's `accessType`:
 *
 * - `public`           → no check, payload returned immediately.
 * - `private`          → requester must be the record owner.
 * - `nft_holders_only` → requester must hold ≥1 token in the NFT contract.
 *
 * @param id                 MongoDB ObjectId of the SPV record.
 * @param stellarPublicKey   G-address of the requester.
 * @returns The `encryptedPayload` string on success.
 *
 * @throws {AppError} 400  – invalid `id` format.
 * @throws {AppError} 403  – access denied (wrong owner or no NFT).
 * @throws {AppError} 404  – record not found.
 * @throws {AppError} 502  – Stellar RPC unreachable (nft_holders_only only).
 */
async function decryptSPVRecord(
  id: string,
  stellarPublicKey: string
): Promise<string> {
  assertValidObjectId(id);

  const record = await SPVModel.findById(id).lean<ISPVRecord>();
  if (!record) {
    throw new AppError(
      `SPV record not found: '${id}'`,
      StatusCodes.NOT_FOUND,
      "RECORD_NOT_FOUND"
    );
  }

  switch (record.accessType) {
    case "public":
      // No restriction – any caller may access the payload.
      return record.encryptedPayload;

    case "private":
      // Only the original owner may decrypt.
      if (stellarPublicKey !== record.ownerPublicKey) {
        throw new AppError(
          "Access denied: you are not the owner of this record",
          StatusCodes.FORBIDDEN,
          "NOT_OWNER"
        );
      }
      return record.encryptedPayload;

    case "nft_holders_only": {
      // Requester must hold at least one token in the associated NFT contract.
      const contractAddress = record.nftContractAddress!;
      const ownership = await checkNFTOwnership(
        stellarPublicKey,
        contractAddress
      );

      if (!ownership.holdsToken) {
        throw new AppError(
          "Access denied: NFT ownership required to decrypt this record",
          StatusCodes.FORBIDDEN,
          "NFT_OWNERSHIP_REQUIRED"
        );
      }

      console.info(
        "[SPVService] NFT access granted for %s (balance: %s) on contract %s",
        stellarPublicKey,
        ownership.balance,
        contractAddress
      );

      return record.encryptedPayload;
    }

    default: {
      // Exhaustive check – should never be reached with valid data.
      const _exhaustive: never = record.accessType;
      throw new AppError(
        `Unknown accessType: '${_exhaustive}'`,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "UNKNOWN_ACCESS_TYPE"
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Exported service object
// ---------------------------------------------------------------------------
export const spvService = {
  createSPVRecord,
  getSPVRecord,
  decryptSPVRecord,
} as const;
