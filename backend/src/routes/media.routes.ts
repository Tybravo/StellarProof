import { Router } from "express";
import { mediaController } from "../controllers/media.controller";
import { uploadMiddleware } from "../middlewares/upload.middleware";

const router = Router();

/**
 * POST /api/v1/media/upload
 * Upload a media file to Cloudinary.
 * Accepts multipart/form-data with a single 'file' field.
 * Returns the secure URL and DB record metadata.
 */
router.post(
  "/upload",
  uploadMiddleware.single("file"),
  mediaController.uploadMedia.bind(mediaController)
);

export default router;
