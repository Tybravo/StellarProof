import { UploadRequest, UploadResult, StorageProvider, StorageError } from '../types/storage.types';
import { cloudinaryService } from './cloudinary.service';
import { ipfsService } from './ipfs.service';
import StorageRecord, { IStorageRecord } from '../models/StorageRecord.model';

/**
 * Storage Orchestrator Service
 * Factory that routes upload requests to the appropriate provider (Cloudinary or IPFS)
 * Ensures all uploads are persisted to MongoDB before returning
 */
class StorageOrchestratorService {
  /**
   * Orchestrate the upload based on the requested storage provider
   * Routes to the appropriate provider, persists result to DB, and returns saved record
   */
  async orchestrate(request: UploadRequest): Promise<UploadResult> {
    // Validate provider
    const validProviders: StorageProvider[] = ['cloudinary', 'ipfs'];
    if (!validProviders.includes(request.storageProvider)) {
      throw new StorageError(
        null,
        'orchestrate',
        `Invalid storage provider: ${request.storageProvider}. Supported providers: ${validProviders.join(', ')}`,
        400,
      );
    }

    // Delegate to provider
    let uploadResult: UploadResult;

    try {
      switch (request.storageProvider) {
        case 'cloudinary':
          const cloudinaryUpload = await cloudinaryService.uploadBuffer(request.buffer);
          uploadResult = {
            provider: 'cloudinary',
            url: cloudinaryUpload.secure_url,
            publicId: cloudinaryUpload.public_id,
            size: cloudinaryUpload.bytes,
            mimetype: request.mimetype,
            uploadedAt: new Date(cloudinaryUpload.created_at)
          };
          break;

        case 'ipfs':
          const ipfsUpload = await ipfsService.upload({
            content: request.buffer,
            name: request.originalname
          });
          uploadResult = {
            provider: 'ipfs',
            url: ipfsUpload.gatewayUrl,
            cid: ipfsUpload.cid,
            size: ipfsUpload.size,
            mimetype: request.mimetype,
            uploadedAt: new Date(ipfsUpload.timestamp)
          };
          break;

        default:
          // TypeScript exhaustiveness check
          const _exhaustive: never = request.storageProvider;
          throw new StorageError(
            request.storageProvider,
            'orchestrate',
            `Unhandled provider: ${_exhaustive}`,
            500,
          );
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        request.storageProvider,
        'orchestrate',
        `Provider delegation failed: ${error instanceof Error ? error.message : String(error)}`,
        502,
      );
    }

    // Persist result to MongoDB
    const storageRecord = new StorageRecord({
      userId: request.userId,
      provider: uploadResult.provider,
      url: uploadResult.url,
      cid: uploadResult.cid,
      publicId: uploadResult.publicId,
      size: uploadResult.size,
      mimetype: uploadResult.mimetype,
      originalFilename: request.originalname,
      uploadedAt: uploadResult.uploadedAt,
    });

    try {
      const savedRecord = await storageRecord.save();

      // Return the saved record (not the provider result)
      // Ensures response data always comes from MongoDB
      return {
        provider: savedRecord.provider,
        url: savedRecord.url,
        cid: savedRecord.cid,
        publicId: savedRecord.publicId,
        size: savedRecord.size,
        mimetype: savedRecord.mimetype,
        uploadedAt: savedRecord.uploadedAt,
      };
    } catch (dbError) {
      throw new StorageError(
        request.storageProvider,
        'persist',
        `Failed to persist upload record to database: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        500,
      );
    }
  }
}

export const storageOrchestratorService = new StorageOrchestratorService();
