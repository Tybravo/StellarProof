import { NextFunction, Request, Response } from 'express';
import { certificateService } from '../services/certificate.service';
import { HttpError } from '../utils/httpError';

export const getCertificateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || !id.trim()) {
      throw new HttpError(400, 'Certificate id is required');
    }

    const certificate = await certificateService.getCertificateById(id.trim());
    if (!certificate) {
      throw new HttpError(404, 'Certificate not found');
    }

    res.status(200).json({
      status: 'success',
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};
