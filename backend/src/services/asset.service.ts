import Asset, { IAsset } from "../models/Asset.model";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { VerificationJobModel } from "../models/verificationJob.model";
import type { AssetRequester, DeletedAssetResult } from "../types/asset.types";
import type { PinReleaseOutcome } from "../types/ipfs.types";
import { pinLifecycleService } from "./pinLifecycle.service";

class AssetService {
  /**
   * Creates a new asset record in the database.
   */
  async createAsset(data: {
    creatorId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageProvider: "mongodb" | "ipfs" | "s3" | "cloudinary";
    storageReferenceId: string;
    isEncrypted?: boolean;
  }): Promise<IAsset> {
    const asset = new Asset({
      ...data,
      creatorId: new mongoose.Types.ObjectId(data.creatorId),
    });
    return await asset.save();
  }

  /**
   * Creates an asset from an upload result.
   */
  async createFromUpload(data: {
    creatorId: string;
    fileName: string;
    upload: any;  // UploadResult type
  }): Promise<IAsset> {
    return this.createAsset({
      creatorId: data.creatorId,
      fileName: data.fileName,
      mimeType: data.upload.mimetype || 'application/octet-stream',
      sizeBytes: data.upload.size || 0,
      storageProvider: data.upload.provider || 'ipfs',
      storageReferenceId: data.upload.cid || data.upload.publicId || '',
    });
  }

  /**
   * Retrieves an asset by its ID.
   */
  async getAssetById(id: string): Promise<IAsset | null> {
    return await Asset.findById(id);
  }

  /**
   * Deletes an asset owned by the requester (or any asset, for admins).
   * IPFS assets have their pin released first, unless another record still
   * references the same CID. If Pinata fails, the asset is kept so the
   * deletion can be retried and the pin is never leaked.
   */
  async deleteAsset(id: string, requester: AssetRequester): Promise<DeletedAssetResult> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid asset id", StatusCodes.BAD_REQUEST, "INVALID_ASSET_ID");
    }

    const asset = await Asset.findById(id).exec();
    if (!asset) {
      throw new AppError("Asset not found", StatusCodes.NOT_FOUND, "ASSET_NOT_FOUND");
    }

    const isOwner = asset.creatorId.toString() === requester.id;
    if (!isOwner && requester.role !== "admin") {
      throw new AppError(
        "You do not have permission to delete this asset",
        StatusCodes.FORBIDDEN,
        "FORBIDDEN"
      );
    }

    const assetId = asset._id as mongoose.Types.ObjectId;
    const linkedJob = await VerificationJobModel.exists({ assetId }).exec();
    if (linkedJob) {
      throw new AppError(
        "Asset is referenced by a verification job and cannot be deleted",
        StatusCodes.CONFLICT,
        "ASSET_IN_USE"
      );
    }

    let pinRelease: PinReleaseOutcome | undefined;
    if (asset.storageProvider === "ipfs") {
      pinRelease = await pinLifecycleService.releaseIfUnreferenced(asset.storageReferenceId, [
        assetId,
      ]);
    }

    await Asset.deleteOne({ _id: assetId }).exec();

    return {
      assetId: assetId.toString(),
      fileName: asset.fileName,
      storageProvider: asset.storageProvider,
      storageReferenceId: asset.storageReferenceId,
      deletedAt: new Date(),
      ...(pinRelease ? { pinRelease } : {}),
    };
  }
}

export const assetService = new AssetService();
