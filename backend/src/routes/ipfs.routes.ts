import { Router } from "express";
import multer from "multer";
import { ipfsController } from "../controllers/ipfs.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

/**
 * POST /api/v1/ipfs/upload/file
 * Upload a binary file to IPFS via Pinata.
 * Accepts multipart/form-data with a single 'file' field.
 * Returns: { success: true, data: { cid, size, name, timestamp, gatewayUrl } }
 */
router.post(
  "/upload/file",
  upload.single("file"),
  ipfsController.uploadFile.bind(ipfsController)
);

/**
 * POST /api/v1/ipfs/upload/json
 * Upload a JSON document to IPFS via Pinata.
 * Accepts application/json body. Optional 'name' and 'metadata' fields are
 * extracted; the rest of the body becomes the pinned document.
 * Returns: { success: true, data: { cid, size, name, timestamp, gatewayUrl } }
 */
router.post(
  "/upload/json",
  ipfsController.uploadJson.bind(ipfsController)
);

export default router;
