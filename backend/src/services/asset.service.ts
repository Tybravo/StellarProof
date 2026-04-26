import Asset, { IAsset } from "../models/Asset.model";
import mongoose from "mongoose";

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
   * Retrieves an asset by its ID.
   */
  async getAssetById(id: string): Promise<IAsset | null> {
    return await Asset.findById(id);
  }
}

export const assetService = new AssetService();
