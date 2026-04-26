import { Router } from "express";
import { mediaController } from "../controllers/media.controller";
import { uploadMiddleware } from "../middlewares/upload.middleware";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

/**
 * POST /api/v1/media/upload
 * Upload a media file to Cloudinary.
 * Requires Authentication.
 */
router.post(
  "/upload",
  protect,
  uploadMiddleware.single("file"),
  mediaController.uploadMedia.bind(mediaController)
);

export default router;
