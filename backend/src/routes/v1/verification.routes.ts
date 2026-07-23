import { Router } from 'express';
import { protect } from '../../middlewares/auth.middleware';
import { verificationController } from '../../controllers/verification.controller';

const router = Router();

router.post('/submit', protect, verificationController.submit.bind(verificationController));

export default router;
