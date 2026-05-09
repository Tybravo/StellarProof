import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";

import { verificationController } from "../controllers/verification.controller";
import { validateBody, validateParams } from "../middlewares/validate";
import { VerificationStatus } from "../types/verification.types";

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const URL_REGEX = /^https?:\/\/.+/;

const STATUS_VALUES = Object.values(VerificationStatus) as [
  VerificationStatus,
  ...VerificationStatus[]
];

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
  id: z.string().regex(MONGO_OBJECT_ID_REGEX, "id must be a valid MongoDB ObjectId"),
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

function validateOwnerQuery(req: Request, res: Response, next: NextFunction): void {
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

const router = Router();

router.post(
  "/",
  validateBody(createJobSchema),
  verificationController.createJob.bind(verificationController)
);

router.get(
  "/",
  validateOwnerQuery,
  verificationController.listJobsByOwner.bind(verificationController)
);

router.get(
  "/:id",
  validateParams(jobIdParamsSchema),
  verificationController.getJob.bind(verificationController)
);

router.patch(
  "/:id/status",
  validateParams(jobIdParamsSchema),
  validateBody(updateStatusSchema),
  verificationController.updateStatus.bind(verificationController)
);

export default router;
