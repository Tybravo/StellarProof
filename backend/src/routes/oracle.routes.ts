import { Router } from "express";
import { health } from "../controllers/oracle.controller";

const router = Router();

/**
 * @swagger
 * /api/v1/oracle/health:
 *   get:
 *     summary: Return persisted oracle liveness and attestation metrics
 *     tags: [Oracle]
 *     responses:
 *       200:
 *         description: Oracle health snapshot
 */
router.get("/health", health);

export default router;
