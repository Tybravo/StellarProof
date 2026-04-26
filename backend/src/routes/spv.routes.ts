import { Router } from 'express';
import multer from 'multer';
import { protect } from '../middlewares/auth.middleware';
import { handleSPVUpload } from '../middlewares/spv.middleware';
import {
  uploadEncryptedAsset,
  getSPVRecord,
  getUserSPVRecords,
  updateSealedStatus,
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

export default router;