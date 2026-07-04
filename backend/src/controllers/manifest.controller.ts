import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../errors/AppError';
import { manifestService } from '../services/manifest.service';
import type { ListManifestsQuery } from '../types/manifest.types';

class ManifestController {
  /**
   * GET /api/v1/manifests
   */
  public async listManifests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query as unknown as ListManifestsQuery;
      const result = await manifestService.listManifests(query);
      
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/manifests
   */
  public async createManifest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const manifestPayload = req.body;
      const user = req.user;

      if (!user) {
        throw new AppError('Authentication required', StatusCodes.UNAUTHORIZED, 'AUTH_REQUIRED');
      }

      if (!manifestPayload || typeof manifestPayload !== 'object') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: 'Valid manifest data payload is required',
        });
        return;
      }

      // USE THE SANITIZATION PIPELINE HERE
      const savedManifest = await manifestService.processManifest(manifestPayload);

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Manifest created and hashed deterministically',
        data: {
          id: savedManifest._id,
          manifestHash: savedManifest.manifestHash,
          contentHash: savedManifest.contentHash,
          createdAt: savedManifest.createdAt,
        },
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          error: 'A manifest with this exact data and hash already exists',
        });
        return;
      }
      
      // If our validation error throws, send a 400 Bad Request
      if (error.message && error.message.includes('Validation Error')) {
        res.status(StatusCodes.BAD_REQUEST).json({ success: false, error: error.message });
        return;
      }
      
      next(error);
    }
  }
}

export const manifestController = new ManifestController();