import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware';
import {
  uploadEncryptedAsset,
  getSPVRecord,
  getUserSPVRecords,
  updateSealedStatus
} from '../controllers/spv.controller';

const router = Router();

// Store uploads in memory so the service receives a Buffer directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * POST /api/v1/spv/upload
 * Upload a file with SPV encryption
 */
router.post('/upload', protect, upload.single('file'), uploadEncryptedAsset);

/**
 * GET /api/v1/spv/records/user
 * Get all SPV records for the authenticated user
 */
router.get('/records/user', protect, getUserSPVRecords);

/**
 * GET /api/v1/spv/:spvId
 * Get SPV record by ID
 */
router.get('/:spvId', protect, getSPVRecord);

/**
 * PATCH /api/v1/spv/records/:id/seal
 * Update the sealed status of an SPV record
 */
router.patch('/records/:id/seal', protect, updateSealedStatus);

export default router;
