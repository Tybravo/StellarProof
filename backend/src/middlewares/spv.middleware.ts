import { Request, Response, NextFunction } from 'express';
import * as spvService from '../services/spv.service';

/**
 * SPV Middleware
 * Intercepts media uploads flagged for the Sealed Provenance Vault (SPV)
 * and routes them through KMS encryption before storage.
 */

/**
 * Middleware to handle SPV-flagged uploads
 * Checks if req.body.isSealed is true and encrypts the file buffer
 * before passing it to the Storage Orchestrator
 */
export const handleSPVUpload = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if this upload is flagged for SPV
    const isSealed = req.body.isSealed === 'true' || req.body.isSealed === true;

    if (!isSealed) {
      // Not an SPV upload, proceed normally
      next();
      return;
    }

    // Validate required fields for SPV upload
    if (!req.file) {
      res.status(400).json({
        status: 'error',
        message: 'No file provided for SPV upload'
      });
      return;
    }

    if (!req.body.userId) {
      res.status(400).json({
        status: 'error',
        message: 'userId is required for SPV upload'
      });
      return;
    }

    // Encrypt the file buffer using KMS service
    const encryptedData = await spvService.encryptFileForSPV(
      req.file.buffer,
      req.body.userId
    );

    // Attach encrypted data to request for downstream processing
    req.body.encryptedFile = {
      buffer: encryptedData.encryptedBuffer,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      keyVersion: encryptedData.keyVersion,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    };

    // Mark that encryption has been applied
    req.body.isEncrypted = true;

    next();
  } catch (error: any) {
    console.error('Error in SPV middleware:', error);

    // Handle specific error cases
    if (error.message === 'No active KMS key found for user') {
      res.status(404).json({
        status: 'error',
        message: 'No active encryption key found. Please initialize KMS first.'
      });
      return;
    }

    if (error.message.includes('Invalid userId')) {
      res.status(400).json({
        status: 'error',
        message: error.message
      });
      return;
    }

    // Generic error response
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during SPV encryption',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
