import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyJWT } from '../middlewares/jwt.middleware';
import { manifestController } from "../controllers/manifest.controller";

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

const listManifestsQuerySchema = z.object({
  ownerPublicKey: z
    .string()
    .regex(STELLAR_PUBLIC_KEY_REGEX, "Invalid Stellar public key (G...)"),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("limit must be an integer")
        .min(1, "limit must be at least 1")
        .max(100, "limit must be at most 100")
    ),
  skip: z
    .string()
    .optional()
    .default("0")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("skip must be an integer")
        .min(0, "skip must be a non-negative integer")
    ),
});

function validateListManifestsQuery(req: Request, res: Response, next: NextFunction): void {
  const result = listManifestsQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: "Invalid query parameters",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }
  req.query = result.data as unknown as typeof req.query;
  next();
}

const router = Router();

/**
 * GET /api/v1/manifests?ownerPublicKey=G...&limit=20&skip=0
 */
router.get(
  "/",
  validateListManifestsQuery,
  manifestController.listManifests.bind(manifestController)
);

/**
 * POST /api/v1/manifests
 * Ingests and sanitizes a dynamic metadata manifest
 */
router.post(
  "/",
  manifestController.createManifest.bind(manifestController)
);

export default router;
