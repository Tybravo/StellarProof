import { Router } from 'express';
import { rotateKey, getUserKeys, getActiveKey, revokeKey } from '../controllers/kms.controller';

const router = Router();

/**
 * POST /api/v1/kms/rotate
 * Rotate KMS key for a user
 */
router.post('/rotate', rotateKey);

/**
 * GET /api/v1/kms/keys/:userId
 * Get all KMS keys for a user
 */
router.get('/keys/:userId', getUserKeys);

/**
 * GET /api/v1/kms/keys/:userId/active
 * Get active KMS key for a user
 */
router.get('/keys/:userId/active', getActiveKey);

/**
 * DELETE /api/v1/kms/keys/:id
 * Revoke a KMS key (set isActive to false)
 */
router.delete('/keys/:id', revokeKey);

export default router;

