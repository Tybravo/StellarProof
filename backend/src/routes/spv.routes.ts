import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware';
import { handleSPVUpload } from '../middlewares/spv.middleware';
import {
  uploadEncryptedAsset,
  getSPVRecord,
  getUserSPVRecords,
  updateSealedStatus,
  sealSPV
} from '../controllers/spv.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

router.post('/upload', protect, upload.single('file'), handleSPVUpload, uploadEncryptedAsset);

router.get('/records/user', protect, getUserSPVRecords);

router.get('/:spvId', protect, getSPVRecord);

router.patch('/records/:id/seal', protect, updateSealedStatus);

/**
 * POST /api/v1/spv/seal
 * Creates a Secure Proof Vault (SPV) record that links an Asset to an access control type and a generated KMS key.
 */
router.post('/seal', sealSPV);

export default router;
