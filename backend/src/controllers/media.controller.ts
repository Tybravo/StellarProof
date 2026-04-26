import { Request, Response } from "express";
import { cloudinaryService } from "../services/cloudinary.service";
import { assetService } from "../services/asset.service";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";

class MediaController {
  /**
   * Handle media upload.
   * Uploads to Cloudinary, saves metadata to DB, and returns the DB record.
   */
  async uploadMedia(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    // 1. Upload to Cloudinary
    const cloudinaryResult = await cloudinaryService.uploadBuffer(
      req.file.buffer,
      req.file.originalname
    );

    // 2. Save metadata to Database
    const asset = await assetService.createAsset({
      creatorId: (req.user as any).id,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      storageProvider: "cloudinary",
      storageReferenceId: cloudinaryResult.public_id,
      isEncrypted: false,
    });

    // 3. Retrieve from DB (to ensure we return the actual stored record)
    const storedAsset = await assetService.getAssetById(asset._id as any);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Media uploaded successfully",
      data: {
        assetId: storedAsset?._id,
        fileName: storedAsset?.fileName,
        url: cloudinaryResult.secure_url,
        storageProvider: storedAsset?.storageProvider,
        createdAt: storedAsset?.createdAt,
      },
    });
  }
}

export const mediaController = new MediaController();
