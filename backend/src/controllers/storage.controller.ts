import { Request, Response, NextFunction } from 'express';
import { storageOrchestratorService } from '../services/storage.service';
import { StorageError } from '../types/storage.types';

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
