import Asset, { IAsset } from "../models/Asset.model";
import mongoose from "mongoose";

class AssetService {
  /**
   * Create a new asset record in the database.
   */
  async createAsset(data: Partial<IAsset>): Promise<IAsset> {
    const asset = new Asset(data);
    return await asset.save();
  }

  /**
   * Get an asset by ID.
   */
  async getAssetById(id: string): Promise<IAsset | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return await Asset.findById(id).exec();
  }

  /**
   * Get all assets for a user.
   */
  async getAssetsByUser(userId: string): Promise<IAsset[]> {
    return await Asset.find({ creatorId: userId }).sort({ createdAt: -1 }).exec();
  }
}

export const assetService = new AssetService();
