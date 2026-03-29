import { Router } from 'express';
import { generateApiKey } from '../controllers/developer.controller';

const router = Router();

router.post('/keys', generateApiKey);

export default router;
