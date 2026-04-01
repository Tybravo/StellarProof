/**
 * Verification Routes – request validation schemas and route definitions.
 *
 * Endpoints:
 *   POST   /api/v1/verification/jobs              – create a new job
 *   GET    /api/v1/verification/jobs?ownerPublicKey=G...  – list jobs by owner
 *   GET    /api/v1/verification/jobs/:id           – get a single job
 *   PATCH  /api/v1/verification/jobs/:id/status    – advance job state
 *
 * All Zod schemas are co-located with the routes that use them.
 */
import { Router } from "express";
import { z } from "zod";
import { verificationController } from "../controllers/verification.controller";
import { validateBody, validateParams } from "../middleware/validate";
import { VerificationStatus } from "../types/verification.types";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

// ---------------------------------------------------------------------------
// Validation patterns
// ---------------------------------------------------------------------------
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const URL_REGEX = /^https?:\/\/.+/;

// All valid status values as a Zod tuple (required for z.enum)
const STATUS_VALUES = Object.values(VerificationStatus) as [
  VerificationStatus,
  ...VerificationStatus[]
];

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const createJobSchema = z.object({
  ownerPublicKey: z
    .string()
    .regex(STELLAR_PUBLIC_KEY_REGEX, "Invalid Stellar public key (G...)"),
  contentHash: z
    .string()
    .regex(SHA256_HEX_REGEX, "contentHash must be a valid SHA-256 hex digest"),
  webhookUrl: z
    .string()
    .regex(URL_REGEX, "webhookUrl must be a valid http/https URL")
    .optional(),
});

const jobIdParamsSchema = z.object({
  id: z
    .string()
    .regex(MONGO_OBJECT_ID_REGEX, "id must be a valid MongoDB ObjectId"),
});

const ownerPublicKeyQuerySchema = z.object({
  ownerPublicKey: z
    .string()
    .regex(STELLAR_PUBLIC_KEY_REGEX, "Invalid Stellar public key (G...)"),
});

const updateStatusSchema = z
  .object({
    status: z.enum(STATUS_VALUES, {
      errorMap: () => ({
        message: `status must be one of: ${STATUS_VALUES.join(", ")}`,
      }),
    }),
    errorMessage: z.string().min(1).optional(),
    teeAttestationHash: z
      .string()
      .regex(SHA256_HEX_REGEX, "teeAttestationHash must be a valid SHA-256 hex digest")
      .optional(),
    teeSignature: z.string().min(1).optional(),
    codeMeasurementHash: z
      .string()
      .regex(SHA256_HEX_REGEX, "codeMeasurementHash must be a valid SHA-256 hex digest")
      .optional(),
    stellarTransactionHash: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === VerificationStatus.TEE_VERIFYING) {
      if (!data.teeAttestationHash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teeAttestationHash"],
          message: "teeAttestationHash is required when transitioning to 'tee_verifying'",
        });
      }
      if (!data.teeSignature) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teeSignature"],
          message: "teeSignature is required when transitioning to 'tee_verifying'",
        });
      }
      if (!data.codeMeasurementHash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["codeMeasurementHash"],
          message: "codeMeasurementHash is required when transitioning to 'tee_verifying'",
        });
      }
    }

    if (data.status === VerificationStatus.MINTING) {
      if (!data.stellarTransactionHash) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stellarTransactionHash"],
          message: "stellarTransactionHash is required when transitioning to 'minting'",
        });
      }
    }

    if (data.status === VerificationStatus.FAILED) {
      if (!data.errorMessage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["errorMessage"],
          message: "errorMessage is required when transitioning to 'failed'",
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// Query validation middleware (ownerPublicKey)
// ---------------------------------------------------------------------------

function validateOwnerQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = ownerPublicKeyQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: "Invalid query parameters",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * POST /api/v1/verification/jobs
 * Creates a new VerificationJob in the `pending` state.
 */
router.post(
  "/",
  validateBody(createJobSchema),
  verificationController.createJob.bind(verificationController)
);

/**
 * GET /api/v1/verification/jobs?ownerPublicKey=G...
 * Lists all VerificationJobs for the given owner, newest-first.
 */
router.get(
  "/",
  validateOwnerQuery,
  verificationController.listJobsByOwner.bind(verificationController)
);

/**
 * GET /api/v1/verification/jobs/:id
 * Retrieves a single VerificationJob by its MongoDB ObjectId.
 */
router.get(
  "/:id",
  validateParams(jobIdParamsSchema),
  verificationController.getJob.bind(verificationController)
);

/**
 * PATCH /api/v1/verification/jobs/:id/status
 * Advances the job to the requested status, enforcing state machine rules.
 */
router.patch(
  "/:id/status",
  validateParams(jobIdParamsSchema),
  validateBody(updateStatusSchema),
  verificationController.updateStatus.bind(verificationController)
);

export default router;
