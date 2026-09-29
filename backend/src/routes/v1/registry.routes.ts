import { Router } from "express";
import { registryController } from "../../controllers/registry.controller";
import { requireAdmin } from "../../middlewares/admin.middleware";
import { verifyJWT } from "../../middlewares/jwt.middleware";

const router = Router();

router.use(verifyJWT, requireAdmin);
router.get("/tee-hashes", registryController.listTeeHashes);
router.post("/tee-hashes", registryController.addTeeHash);
router.delete("/tee-hashes/:hash", registryController.removeTeeHash);
router.get("/providers", registryController.listProviders);
router.post("/providers", registryController.addProvider);
router.delete("/providers/:provider", registryController.removeProvider);

export default router;
