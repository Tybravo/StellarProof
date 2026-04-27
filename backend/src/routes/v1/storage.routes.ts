import { Router } from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/storage.controller';

/**
 * Storage Routes - v1
 * Mount at /api/v1/storage
 */
const router = Router();

/**
 * Configure multer for in-memory file uploads
 * Stores file buffer in memory for direct streaming to providers
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow all MIME types - provider-specific validation if needed
    cb(null, true);
  },
});

/**
 * POST /api/v1/storage/upload
 * Upload a file to the specified storage provider (Cloudinary or IPFS)
 * 
 * Request:
 *   - file: multipart form data file
 *   - storageProvider: 'cloudinary' | 'ipfs' (in form data or JSON body)
 *   - userId: string (if not using auth middleware)
 * 
 * Response:
 *   - 201: Upload successful with saved record
 *   - 400: Invalid input or provider
 *   - 401: Authentication required
 *   - 502: Provider error (upstream failure)
 */
router.post('/upload', upload.single('file'), uploadFile);

export default router;
