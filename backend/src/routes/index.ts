/**
 * Root router.
 * Mounts the versioned API sub-routers and a health-check endpoint.
 */
import { Router, type Request, type Response } from "express";
import certificateRoutes from "./certificate.routes";
import spvRoutes from "./spv.routes";
import verificationRoutes from "./verification.routes";
import manifestRoutes from "./manifest.routes";
import developerRoutes from "./developer.routes";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import ipfsRoutes from "./ipfs.routes";

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

router.use("/api/v1/certificates", certificateRoutes);
router.use("/api/v1/manifests", manifestRoutes);
router.use("/api/v1/spv/records", spvRoutes);
router.use("/api/v1/verification/jobs", verificationRoutes);
router.use("/api/v1/developer", developerRoutes);
router.use("/api/v1/auth", authRoutes);
router.use("/api/v1/users", userRoutes);
router.use("/api/v1/ipfs", ipfsRoutes);

export default router;
