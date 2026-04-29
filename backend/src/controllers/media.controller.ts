import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { cloudinaryService } from "../services/cloudinary.service";
import { assetService } from "../services/asset.service";
import { AppError } from "../errors/AppError";

export class MediaController {
  /**
   * Uploads a media file to Cloudinary and saves metadata to DB.
   */
  async uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(
          "No file provided. Send a multipart/form-data request with a 'file' field.",
          StatusCodes.BAD_REQUEST,
          "NO_FILE_PROVIDED"
        );
      }

      // 1. Upload to Cloudinary via Service
      const uploadResult = await cloudinaryService.uploadBuffer(file.buffer);

      // 2. Save to Database via Service
      // Note: In a real app, req.user.id would come from auth middleware
      const creatorId = (req as any).user?.id || "60d0fe4f53112b6158880001"; // Fallback for demo/testing

      const newAsset = await assetService.createAsset({
        creatorId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageProvider: "cloudinary",
        storageReferenceId: uploadResult.secure_url, // Storing secure URL as reference
        isEncrypted: false,
      });

      // 3. Retrieve from Database to ensure "Data Source" requirement
      const retrievedAsset = await assetService.getAssetById((newAsset._id as any).toString());

      if (!retrievedAsset) {
        throw new AppError(
          "Failed to retrieve asset from database after creation",
          StatusCodes.INTERNAL_SERVER_ERROR,
          "DB_RETRIEVAL_FAILED"
        );
      }

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Media uploaded and saved successfully",
        data: {
          assetId: retrievedAsset._id,
          url: retrievedAsset.storageReferenceId,
          fileName: retrievedAsset.fileName,
          mimeType: retrievedAsset.mimeType,
          sizeBytes: retrievedAsset.sizeBytes,
          createdAt: retrievedAsset.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const mediaController = new MediaController();
