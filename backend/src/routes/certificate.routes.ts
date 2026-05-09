/**
 * Certificate Routes – request validation schemas and route definitions.
 *
 * Endpoints:
 *   GET /api/v1/certificates?creatorId=<ObjectId>&limit=20&skip=0
 *     Returns a paginated list of certificates owned by the given user.
 *
 * All Zod schemas are co-located with the routes that use them.
 */
import { Router } from "express";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { certificateController } from "../controllers/certificate.controller";

// ---------------------------------------------------------------------------
// Zod schema – query parameters for the certificate list endpoint
// ---------------------------------------------------------------------------
const listCertificatesQuerySchema = z.object({
  creatorId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "creatorId must be a valid MongoDB ObjectId"),
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
function validateListCertificatesQuery(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = listCertificatesQuerySchema.safeParse(req.query);
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

/**
 * GET /api/v1/certificates?creatorId=<ObjectId>&limit=20&skip=0
 *
 * Query parameters:
 *   - creatorId  (required) – MongoDB ObjectId of the certificate owner.
 *   - limit      (optional, 1–100, default 20) – page size.
 *   - skip       (optional, ≥0, default 0)     – offset for pagination.
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "certificates": [ ...ICertificate ],
 *     "total": 42,
 *     "limit": 20,
 *     "skip": 0
 *   }
 * }
 */
router.get(
  "/",
  validateListCertificatesQuery,
  certificateController.listCertificates.bind(certificateController)
);

export default router;
