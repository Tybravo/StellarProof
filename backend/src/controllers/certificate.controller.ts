import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../errors/AppError";
import { certificateService } from "../services/certificate.service";
import type { ListCertificatesQuery } from "../types/certificate.types";

export class CertificateController {
  async listCertificates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as ListCertificatesQuery;
      const result = await certificateService.listCertificates(query);
      res.status(StatusCodes.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCertificateById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id?.trim();
      if (!id) {
        throw new AppError(
          "Certificate id is required",
          StatusCodes.BAD_REQUEST,
          "MISSING_CERTIFICATE_ID"
        );
      }

      const certificate = await certificateService.getCertificateById(id);
      if (!certificate) {
        throw new AppError(
          "Certificate not found",
          StatusCodes.NOT_FOUND,
          "CERTIFICATE_NOT_FOUND"
        );
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data: certificate,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const certificateController = new CertificateController();

export const getCertificateById = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => certificateController.getCertificateById(req, res, next);
