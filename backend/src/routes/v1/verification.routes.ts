import { Router } from 'express';
import { handleMintCallback } from '../../controllers/verification.controller';
import { verifyApiKey } from '../../middlewares/apiKey.middleware';

const router = Router();

router.post('/:jobId/mint-callback', verifyApiKey, handleMintCallback);

export default router;
