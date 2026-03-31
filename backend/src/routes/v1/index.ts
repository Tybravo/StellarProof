import { Router } from 'express';
import healthRoutes from '../health.routes';
import certificateRoutes from './certificate.routes';
import verificationRoutes from './verification.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/certificates', certificateRoutes);
router.use('/verifications', verificationRoutes);

export default router;
