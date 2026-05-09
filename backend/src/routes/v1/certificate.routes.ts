import { Router } from 'express';
import { getCertificateById } from '../../controllers/certificate.controller';

const router = Router();

router.get('/:id', getCertificateById);

export default router;
