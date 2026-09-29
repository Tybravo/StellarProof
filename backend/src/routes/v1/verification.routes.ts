import { Router } from 'express';
import { z } from 'zod';
import { protect } from '../../middlewares/auth.middleware';
import { validateParams } from '../../middlewares/validate';
import { verificationController } from '../../controllers/verification.controller';

const router = Router();
const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

router.post('/submit', protect, verificationController.submit.bind(verificationController));

router.get(
  '/jobs/:id/stream',
  validateParams({ id: z.string().regex(MONGO_OBJECT_ID_REGEX, "id must be a valid MongoDB ObjectId") }),
  verificationController.subscribe.bind(verificationController)
);

export default router;