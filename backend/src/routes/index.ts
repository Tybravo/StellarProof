/**
 * Root router.
 * Mounts the versioned API sub-routers and a health-check endpoint.
 */
import { Router, type Request, type Response } from "express";
import spvRoutes from "./spv.routes";
import verificationRoutes from "./verification.routes";

const router = Router();

/**
 * GET /health
 * Unversioned health check – used by load balancers and Docker HEALTHCHECK.
 */
router.get("/health", (_req: Request, res: Response): void => {
  res.json({
    status: "ok",
    service: "stellarproof-backend",
    timestamp: new Date().toISOString(),
  });
});

/**
 * /api/v1/spv/records  →  SPV record CRUD + NFT-gated decryption
 */
router.use("/api/v1/spv/records", spvRoutes);

/**
 * /api/v1/verification/jobs  →  Verification Job lifecycle state machine
 */
router.use("/api/v1/verification/jobs", verificationRoutes);

export default router;
