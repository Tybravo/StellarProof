import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { assetService } from "../services/asset.service";

export class AssetController {
  /**
   * DELETE /api/v1/assets/:id
   * Deletes an asset and releases its IPFS pin when nothing else references it.
   */
  async deleteAsset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", StatusCodes.UNAUTHORIZED, "AUTH_REQUIRED");
      }

      const result = await assetService.deleteAsset(req.params.id, {
        id: String(req.user._id),
        role: req.user.role,
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: "Asset deleted successfully",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const assetController = new AssetController();
