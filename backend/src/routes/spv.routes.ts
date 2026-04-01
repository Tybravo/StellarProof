/**
 * SPV Routes – request validation schemas and route definitions.
 *
 * All Zod schemas are co-located with the routes that use them.
 * Regex constants are derived from Stellar address specifications:
 *   - Public keys  → G + 55 base32 chars (Ed25519, 56 chars total)
 *   - Contract IDs → C + 55 base32 chars (Soroban contract, 56 chars total)
 *   - SHA-256      → 64 lowercase hex chars
 *   - MongoDB ID   → 24 hex chars
 */
import { Router } from "express";
import { z } from "zod";
import { spvController } from "../controllers/spv.controller";
import { validateBody, validateParams } from "../middleware/validate";

// ---------------------------------------------------------------------------
// Validation patterns
// ---------------------------------------------------------------------------
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const SOROBAN_CONTRACT_REGEX = /^C[A-Z2-7]{55}$/;
const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createRecordSchema = z
  .object({
    ownerPublicKey: z
      .string()
      .regex(STELLAR_PUBLIC_KEY_REGEX, "Invalid Stellar public key (G...)"),
    contentHash: z
      .string()
      .regex(SHA256_HEX_REGEX, "contentHash must be a valid SHA-256 hex digest"),
    manifestHash: z
      .string()
      .regex(
        SHA256_HEX_REGEX,
        "manifestHash must be a valid SHA-256 hex digest"
      ),
    encryptedPayload: z
      .string()
      .min(1, "encryptedPayload cannot be empty"),
    storageId: z.string().min(1, "storageId cannot be empty"),
    accessType: z.enum(["public", "private", "nft_holders_only"], {
      errorMap: () => ({
        message:
          "accessType must be 'public', 'private', or 'nft_holders_only'",
      }),
    }),
    nftContractAddress: z
      .string()
      .regex(
        SOROBAN_CONTRACT_REGEX,
        "nftContractAddress must be a valid Soroban contract address (C...)"
      )
      .optional(),
  })
  .refine(
    (data) =>
      data.accessType !== "nft_holders_only" || !!data.nftContractAddress,
    {
      message:
        "nftContractAddress is required when accessType is 'nft_holders_only'",
      path: ["nftContractAddress"],
    }
  );

const decryptBodySchema = z.object({
  stellarPublicKey: z
    .string()
    .regex(STELLAR_PUBLIC_KEY_REGEX, "Invalid Stellar public key (G...)"),
});

const recordIdParamsSchema = z.object({
  id: z
    .string()
    .regex(MONGO_OBJECT_ID_REGEX, "id must be a valid MongoDB ObjectId"),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * POST /api/v1/spv/records
 * Create a new SPV record.
 */
router.post(
  "/",
  validateBody(createRecordSchema),
  spvController.createRecord.bind(spvController)
);

/**
 * GET /api/v1/spv/records/:id
 * Retrieve an SPV record (without its encrypted payload).
 */
router.get(
  "/:id",
  validateParams(recordIdParamsSchema),
  spvController.getRecord.bind(spvController)
);

/**
 * POST /api/v1/spv/records/:id/decrypt
 * Request decryption of an SPV record.
 * For nft_holders_only records, triggers a live Stellar RPC ownership check.
 */
router.post(
  "/:id/decrypt",
  validateParams(recordIdParamsSchema),
  validateBody(decryptBodySchema),
  spvController.decryptRecord.bind(spvController)
);

export default router;
