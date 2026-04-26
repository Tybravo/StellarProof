import mongoose from 'mongoose';


export interface CleanedAsset {
  assetId: mongoose.Types.ObjectId;
  storageReferenceId: string;
  storageProvider: 'mongodb' | 'ipfs' | 's3' | 'cloudinary';
  remoteDeleteSuccess: boolean;
}


export interface CleanupResult {
  startedAt: string;
  completedAt: string;
  totalFound: number;
  totalDeleted: number;
  totalFailed: number;
  assets: CleanedAsset[];
  errors: string[];
}