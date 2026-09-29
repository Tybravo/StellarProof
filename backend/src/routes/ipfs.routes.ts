import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { ipfsController } from "../controllers/ipfs.controller";
import { protect, restrictTo } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

/**
 * POST /api/v1/ipfs/upload/file
 * Upload a binary file to IPFS via Pinata.
 * Accepts multipart/form-data with a single 'file' field.
 * Returns: { success: true, data: { cid, size, name, timestamp, gatewayUrl,
 *   pinId, pinningStatus: 'pinning' | 'pinned', availability } }
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
 * Returns: { success: true, data: { cid, size, name, timestamp, gatewayUrl,
 *   pinId, pinningStatus: 'pinning' | 'pinned', availability } }
 */
router.post(
  "/upload/json",
  ipfsController.uploadJson.bind(ipfsController)
);

const pinCidSchema = z.object({
  cid: z.string().trim().min(1, "cid is required"),
  name: z.string().trim().min(1).max(255).optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Pin lifecycle management (admin only: pins are account-wide).
 *
 * GET    /api/v1/ipfs/pins?limit=&pageToken=&cid=
 *   List pins, newest first. Each pin reports `tracked` plus the Asset and
 *   Manifest ids that reference it; untracked pins are safe to release.
 *
 * POST   /api/v1/ipfs/pins      { cid, name?, metadata? }
 *   Pin existing IPFS content by CID. Returns 202 with the queued pin.
 *
 * DELETE /api/v1/ipfs/pins/:cid
 *   Release every pin for the CID. Returns 409 CID_IN_USE while an Asset or
 *   Manifest still references it.
 */
router.get(
  "/pins",
  protect,
  restrictTo("admin"),
  ipfsController.listPins.bind(ipfsController)
);

router.post(
  "/pins",
  protect,
  restrictTo("admin"),
  validateBody(pinCidSchema),
  ipfsController.pinCid.bind(ipfsController)
);

router.delete(
  "/pins/:cid",
  protect,
  restrictTo("admin"),
  ipfsController.unpinCid.bind(ipfsController)
);

export default router;
