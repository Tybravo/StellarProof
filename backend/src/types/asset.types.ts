import type { IUser } from "../models/User.model";
import type { PinReleaseOutcome } from "./ipfs.types";

/** Authenticated caller performing an asset operation. */
export interface AssetRequester {
  id: string;
  role: IUser["role"];
}

export interface DeletedAssetResult {
  assetId: string;
  fileName: string;
  storageProvider: "mongodb" | "ipfs" | "s3" | "cloudinary";
  storageReferenceId: string;
  deletedAt: Date;
  /** Present for IPFS assets: whether the backing pin was released. */
  pinRelease?: PinReleaseOutcome;
}
