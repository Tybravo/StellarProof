import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import Asset from '../models/Asset.model';
import Manifest from '../models/Manifest.model';
import { assetService } from '../services/asset.service';
import { contentHashService } from '../services/contentHash.service';
import { storageOrchestratorService } from '../services/storage.service';
import { StorageError, type StorageProvider } from '../types/storage.types';

/**
 * Storage Controller
 * Handles file upload requests and delegates to the storage orchestrator
 */

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract file buffer from multer
    if (!req.file) {
      const error = new StorageError(
        null,
        'upload',
        'No file provided. Please upload a file.',
        400,
      );
      return next(error);
    }

    // Extract storage provider from body
    const { storageProvider } = req.body;
    if (!storageProvider) {
      const error = new StorageError(
        null,
        'upload',
        'Missing storageProvider field. Specify "cloudinary" or "ipfs".',
        400,
      );
      return next(error);
    }

    // Extract userId from auth context or body
    // Priority: req.user.id (from auth middleware) > req.body.userId
    const userId = (req.user as any)?.id || req.body.userId;
    if (!userId) {
      const error = new StorageError(
        storageProvider,
        'upload',
        'User authentication required or userId must be provided in request body.',
        401,
      );
      return next(error);
    }

    // Reject hash mismatches (422) before anything is written to storage
    const contentHash = contentHashService.verify(req.file.buffer, req.body.contentHash);

    // Call orchestrator
    const uploadResult = await storageOrchestratorService.orchestrate({
      storageProvider: storageProvider as any,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      userId,
      contentHash,
    });

    // Return 201 with saved record
    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: uploadResult,
    });
  } catch (error) {
    // Let error handler middleware process all errors
    next(error);
  }
};

function getAuthenticatedUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?.id || user?._id?.toString() || req.body.userId;
}

export const uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(
        "No file provided. Send multipart/form-data with a 'file' field.",
        StatusCodes.BAD_REQUEST,
        'NO_FILE_PROVIDED'
      );
    }

    const storageProvider = req.body.storageProvider || 'ipfs';
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      throw new AppError(
        'User authentication required or userId must be provided in request body.',
        StatusCodes.UNAUTHORIZED,
        'AUTH_REQUIRED'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid userId', StatusCodes.BAD_REQUEST, 'INVALID_USER_ID');
    }

    const contentHash = contentHashService.verify(req.file.buffer, req.body.contentHash);

    const uploadResult = await storageOrchestratorService.orchestrate({
      storageProvider: storageProvider as StorageProvider,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      userId,
      contentHash,
    });

    const asset = await assetService.createFromUpload({
      creatorId: userId,
      fileName: req.file.originalname,
      upload: uploadResult,
    });

    if (uploadResult.recordId) {
      await storageOrchestratorService.linkAsset(uploadResult.recordId, asset._id.toString());
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        assetId: asset._id,
        storageProvider: asset.storageProvider,
        storageReferenceId: asset.storageReferenceId,
        url: uploadResult.url,
        // IPFS uploads: the gateway URL and the real pin/availability state
        // captured before this response was written, so the progression UI can
        // keep the upload pending while the pin propagates.
        ...(uploadResult.gatewayUrl ? { gatewayUrl: uploadResult.gatewayUrl } : {}),
        ...(uploadResult.pinningStatus ? { pinningStatus: uploadResult.pinningStatus } : {}),
        ...(uploadResult.availability ? { availability: uploadResult.availability } : {}),
        cid: uploadResult.cid,
        // The documented media contract names the pinned CID `mediaCid`.
        mediaCid: uploadResult.cid,
        // IPFS pins are always requested as CIDv1.
        cidVersion: uploadResult.cid ? 1 : undefined,
        deduplicated: uploadResult.deduplicated ?? false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pre-upload hash-consistency check.
 * Hashes the multipart buffer, compares it to the client-supplied contentHash
 * and reports existing uploads of the same content. Never writes to storage.
 */
export const verifyContentHash = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(
        "No file provided. Send multipart/form-data with a 'file' field.",
        StatusCodes.BAD_REQUEST,
        'NO_FILE_PROVIDED'
      );
    }

    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      throw new AppError(
        'User authentication required or userId must be provided in request body.',
        StatusCodes.UNAUTHORIZED,
        'AUTH_REQUIRED'
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid userId', StatusCodes.BAD_REQUEST, 'INVALID_USER_ID');
    }

    const result = await contentHashService.checkUpload(req.file.buffer, req.body.contentHash, userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'contentHash matches the uploaded file',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadManifest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { manifestId } = req.body;

    if (typeof manifestId !== 'string') {
      throw new AppError('Valid manifestId is required', StatusCodes.BAD_REQUEST, 'INVALID_MANIFEST_ID');
    }

    const manifest = await Manifest.findById(manifestId);
    if (!manifest) {
      throw new AppError('Manifest not found', StatusCodes.NOT_FOUND, 'MANIFEST_NOT_FOUND');
    }

    const manifestObject = manifest.toObject();
    const { __v, ipfsCid, ipfsUrl, ipfsUploadedAt, ...manifestPayload } = manifestObject as any;
    void __v;
    void ipfsCid;
    void ipfsUrl;
    void ipfsUploadedAt;

    const manifestBuffer = Buffer.from(JSON.stringify(manifestPayload), 'utf8');
    // Link the manifest record to the asset whose media bytes it describes
    const assetId = await storageOrchestratorService.findAssetIdByContentHash(manifest.contentHash);

    const uploadResult = await storageOrchestratorService.orchestrate({
      storageProvider: 'ipfs',
      buffer: manifestBuffer,
      mimetype: 'application/json',
      originalname: `manifest-${manifest._id}.json`,
      userId: manifest.creatorId.toString(),
      kind: 'manifest',
      assetId,
      // Manifests are content-addressed on IPFS; never fall back
      allowFallback: false,
      metadata: {
        manifestId: manifest._id.toString(),
        manifestHash: manifest.manifestHash || '',
      },
    });

    manifest.ipfsCid = uploadResult.cid;
    manifest.ipfsUrl = uploadResult.url;
    manifest.ipfsUploadedAt = uploadResult.uploadedAt;
    await manifest.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Manifest uploaded to IPFS successfully',
      data: {
        manifestId: manifest._id.toString(),
        manifestHash: manifest.manifestHash,
        manifestCid: uploadResult.cid,
        cid: uploadResult.cid,
        url: uploadResult.url,
        gatewayUrl: uploadResult.url,
        ...(uploadResult.pinningStatus ? { pinningStatus: uploadResult.pinningStatus } : {}),
        ...(uploadResult.availability ? { availability: uploadResult.availability } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resolveCid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await storageOrchestratorService.resolveCid(req.params.cid);

    res.status(StatusCodes.OK).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
