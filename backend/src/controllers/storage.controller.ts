import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import Asset from '../models/Asset.model';
import Manifest from '../models/Manifest.model';
import { ipfsService } from '../services/ipfs.service';
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

    // Call orchestrator
    const uploadResult = await storageOrchestratorService.orchestrate({
      storageProvider: storageProvider as any,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      userId,
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

    const uploadResult = await storageOrchestratorService.orchestrate({
      storageProvider: storageProvider as StorageProvider,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      userId,
    });

    const asset = await Asset.create({
      creatorId: new mongoose.Types.ObjectId(userId),
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: uploadResult.size,
      storageProvider: uploadResult.provider,
      storageReferenceId: uploadResult.cid || uploadResult.url,
      isEncrypted: false,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Media uploaded successfully',
      data: {
        assetId: asset._id,
        url: uploadResult.url,
        cid: uploadResult.cid,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadManifest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { manifestId } = req.body;

    if (!manifestId || !mongoose.Types.ObjectId.isValid(manifestId)) {
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
    const uploadResult = await ipfsService.upload({
      content: manifestBuffer,
      name: `manifest-${manifest._id}.json`,
      metadata: {
        manifestId: manifest._id.toString(),
        manifestHash: manifest.manifestHash || '',
      },
    });

    manifest.ipfsCid = uploadResult.cid;
    manifest.ipfsUrl = uploadResult.gatewayUrl;
    manifest.ipfsUploadedAt = new Date(uploadResult.timestamp);
    await manifest.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Manifest uploaded to IPFS successfully',
      data: {
        manifestId: manifest._id,
        cid: manifest.ipfsCid,
        url: manifest.ipfsUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
