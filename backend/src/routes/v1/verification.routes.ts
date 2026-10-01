import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../../middlewares/auth.middleware';
import { requireJobOwnership } from '../../middlewares/ownership.middleware';
import { oracleAuth } from '../../middlewares/oracleAuth.middleware';
import { validateBody, validateParams } from '../../middlewares/validate';
import { verificationController } from '../../controllers/verification.controller';

const router = Router();
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const SHA256_HEX_REGEX = /^[a-fA-F0-9]{64}$/;

const oracleCallbackSchema = z.object({
  jobId: z.string().regex(MONGO_OBJECT_ID_REGEX, "jobId must be a valid MongoDB ObjectId"),
  teeAttestationHash: z
    .string()
    .regex(SHA256_HEX_REGEX, "teeAttestationHash must be a valid SHA-256 hex digest"),
  teeSignature: z.string().min(1, "teeSignature is required"),
});

router.post('/submit', protect, verificationController.submit.bind(verificationController));

router.post(
  '/jobs/oracle/callback',
  oracleAuth,
  validateBody(oracleCallbackSchema),
  verificationController.oracleCallback.bind(verificationController)
);

router.get(
  '/jobs/:id/stream',
  protect,
  validateParams(z.object({
    id: z.string().regex(MONGO_OBJECT_ID_REGEX, "id must be a valid MongoDB ObjectId"),
  })),
  requireJobOwnership,
  verificationController.subscribe.bind(verificationController)
);

export default router;