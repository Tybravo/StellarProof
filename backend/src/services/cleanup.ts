import mongoose from 'mongoose';
import Asset, { IAsset } from '../models/Asset.model';
import { VerificationJobModel } from '../models/verificationJob.model';
import { cloudinary } from '../config/cloudinary';
import { CleanedAsset, CleanupResult } from '../types/cleanup';
import logger from '../utils/logger';


const ORPHAN_AGE_MS = (): number => {
  const hours = parseInt(process.env.CLEANUP_ORPHAN_AGE_HOURS ?? '24', 10);
  if (isNaN(hours) || hours <= 0) {
    throw new Error('CLEANUP_ORPHAN_AGE_HOURS must be a positive integer');
  }
  return hours * 60 * 60 * 1000;
};

/**
 * CleanupService
 *
 * Responsible for finding orphaned Asset documents and deleting them from
 * both MongoDB and their remote storage provider (Cloudinary for s3/cloud
 * assets, no-op for mongodb/ipfs providers).
 *
 * An asset is "orphaned" when ALL of the following are true:
 *   1. It was created more than CLEANUP_ORPHAN_AGE_HOURS ago.
 *   2. No VerificationJob document references its _id.
 *
 */
export class CleanupService {
  /**
   * Find all Asset _ids that have at least one associated VerificationJob.
   * These assets are "linked" and must NOT be deleted.
   */
  private async getLinkedAssetIds(): Promise<mongoose.Types.ObjectId[]> {
    const jobs = await VerificationJobModel.distinct('assetId').exec();
    return jobs as mongoose.Types.ObjectId[];
  }


  private async findOrphanedAssets(): Promise<IAsset[]> {
    const cutoffDate = new Date(Date.now() - ORPHAN_AGE_MS());
    const linkedIds = await this.getLinkedAssetIds();

    return Asset.find({
      createdAt: { $lt: cutoffDate },
      _id: { $nin: linkedIds },
    }).exec();
  }


  private async deleteFromRemoteStorage(asset: IAsset): Promise<boolean> {
    try {
      switch (asset.storageProvider) {
        case 's3': {
          // Cloudinary is used as the cloud storage layer.
          // storageReferenceId holds the Cloudinary public_id.
          const result = await cloudinary.uploader.destroy(
            asset.storageReferenceId,
            { invalidate: true },
          );

          if (result.result !== 'ok' && result.result !== 'not found') {
            logger.warn('Cloudinary deletion returned unexpected result', {
              assetId: asset._id.toString(),
              storageReferenceId: asset.storageReferenceId,
              cloudinaryResult: result.result,
            });
            return false;
          }

          return true;
        }

        case 'mongodb':
          // Data lives in GridFS / the same MongoDB instance — the DB delete
          // below handles this. No separate remote call needed.
          return true;

        case 'ipfs':
          // IPFS is content-addressed and immutable. We cannot "delete" the
          // content, but we can remove the DB reference so it is no longer
          // tracked. Log a warning for observability.
          logger.warn('IPFS asset marked orphaned — DB record will be removed but content persists on IPFS', {
            assetId: asset._id.toString(),
            cid: asset.storageReferenceId,
          });
          return true;

        default:
          logger.error('Unknown storage provider encountered during cleanup', {
            assetId: asset._id.toString(),
            storageProvider: asset.storageProvider,
          });
          return false;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Remote storage deletion threw an exception', {
        assetId: asset._id.toString(),
        storageProvider: asset.storageProvider,
        storageReferenceId: asset.storageReferenceId,
        error: message,
      });
      return false;
    }
  }


  async runOrphanedAssetCleanup(): Promise<CleanupResult> {
    const startedAt = new Date().toISOString();
    const result: CleanupResult = {
      startedAt,
      completedAt: '',
      totalFound: 0,
      totalDeleted: 0,
      totalFailed: 0,
      assets: [],
      errors: [],
    };

    logger.info('Orphaned asset cleanup started');

    let orphans: IAsset[];

    try {
      orphans = await this.findOrphanedAssets();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to query orphaned assets', { error: message });
      result.errors.push(`Query failed: ${message}`);
      result.completedAt = new Date().toISOString();
      return result;
    }

    result.totalFound = orphans.length;
    logger.info(`Found ${orphans.length} orphaned asset(s)`);

    for (const asset of orphans) {
      const assetId = asset._id as mongoose.Types.ObjectId;
      const cleanedEntry: CleanedAsset = {
        assetId,
        storageReferenceId: asset.storageReferenceId,
        storageProvider: asset.storageProvider,
        remoteDeleteSuccess: false,
      };

      // Step 1: Delete from remote storage.
      cleanedEntry.remoteDeleteSuccess = await this.deleteFromRemoteStorage(asset);

      // Step 2: Delete from MongoDB regardless of the remote result.
      // If the remote deletion failed we still remove the DB record to avoid
      // the asset surfacing again on the next run. Operators can reconcile
      // orphaned Cloudinary resources separately via the cleanup result log.
      try {
        await Asset.deleteOne({ _id: assetId }).exec();
        result.totalDeleted++;

        logger.info('Asset deleted', {
          assetId: assetId.toString(),
          storageProvider: asset.storageProvider,
          remoteDeleteSuccess: cleanedEntry.remoteDeleteSuccess,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        result.totalFailed++;
        result.errors.push(`DB delete failed for asset ${assetId.toString()}: ${message}`);

        logger.error('Failed to delete asset from MongoDB', {
          assetId: assetId.toString(),
          error: message,
        });
      }

      result.assets.push(cleanedEntry);
    }

    result.completedAt = new Date().toISOString();

    logger.info('Orphaned asset cleanup completed', {
      totalFound: result.totalFound,
      totalDeleted: result.totalDeleted,
      totalFailed: result.totalFailed,
    });

    return result;
  }
}

export const cleanupService = new CleanupService();
