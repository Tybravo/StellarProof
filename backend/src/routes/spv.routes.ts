import { Router } from 'express';
import multer from 'multer';
import { handleSPVUpload } from '../middlewares/spv.middleware';
import {
  uploadEncryptedAsset,
  getSPVRecord,
  getUserSPVRecords,
  updateSealedStatus
} from '../controllers/spv.controller';

const router = Router();

// Configure multer for memory storage (file buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * POST /api/v1/spv/upload
 * Upload a file with SPV encryption
 * Middleware chain: multer -> SPV middleware -> controller
 */
router.post('/upload', upload.single('file'), handleSPVUpload, uploadEncryptedAsset);

/**
 * GET /api/v1/spv/records/:assetId
 * Get SPV record by asset ID
 */
router.get('/records/:assetId', getSPVRecord);

/**
 * GET /api/v1/spv/records/user/:userId
 * Get all SPV records for a user
 */
router.get('/records/user/:userId', getUserSPVRecords);

/**
 * PATCH /api/v1/spv/records/:id/seal
 * Update the sealed status of an SPV record
 */
router.patch('/records/:id/seal', updateSealedStatus);

export default router;
