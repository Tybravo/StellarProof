import { Router } from "express";
import multer from "multer";
import { mediaController } from "../controllers/media.controller";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

/**
 * POST /api/v1/media/upload
 * Upload a media file to Cloudinary.
 * Accepts multipart/form-data with a single 'file' field.
 * Returns the secure URL and DB record metadata.
 */
router.post(
  "/upload",
  upload.single("file"),
  mediaController.uploadMedia.bind(mediaController)
);

export default router;
