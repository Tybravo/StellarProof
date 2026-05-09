/**
 * Manifest Routes – request validation schemas and route definitions.
 *
 * Endpoints:
 *   GET /api/v1/manifests?ownerPublicKey=G...&limit=20&skip=0
 *     Returns a paginated list of manifests owned by the given Stellar address.
 *
 * All Zod schemas are co-located with the routes that use them.
 * Regex constants follow the same Stellar address specifications used across
 * the rest of the codebase.
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { manifestController } from "../controllers/manifest.controller";

// ---------------------------------------------------------------------------
// Validation patterns
// ---------------------------------------------------------------------------
const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

// ---------------------------------------------------------------------------
// Zod schema – query parameters for the manifest list endpoint
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Query validation middleware
// ---------------------------------------------------------------------------

function validateListManifestsQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = listManifestsQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: "Invalid query parameters",
      details: result.error.flatten().fieldErrors,
    });
    return;
  }
  // Overwrite req.query with the coerced + validated values so the controller
  // receives already-parsed numbers rather than raw strings.
  req.query = result.data as unknown as typeof req.query;
  next();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

/**
 * GET /api/v1/manifests?ownerPublicKey=G...&limit=20&skip=0
 * Returns a paginated list of manifests for the given owner, newest-first.
 */
router.get(
  "/",
  validateListManifestsQuery,
  manifestController.listManifests.bind(manifestController)
);

export default router;
