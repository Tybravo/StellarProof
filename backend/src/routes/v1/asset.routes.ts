import { Router } from "express";
import { assetController } from "../../controllers/asset.controller";
import { protect } from "../../middlewares/auth.middleware";

/**
 * Asset Routes - v1
 * Mount at /api/v1/assets
 */
const router = Router();

/**
 * DELETE /api/v1/assets/:id
 * Owner (or admin) deletes an asset. For IPFS assets the backing pin is
 * released first unless another Asset or Manifest references the same CID.
 *
 * Response:
 *   - 200: Asset deleted; includes pinRelease for IPFS assets
 *   - 400: Invalid asset id
 *   - 401: Authentication required
 *   - 403: Requester does not own the asset
 *   - 404: Asset not found
 *   - 409: Asset is referenced by a verification job
 *   - 502: Pinata unpin failed (asset is kept; retry later)
 */
router.delete("/:id", protect, assetController.deleteAsset.bind(assetController));

export default router;
