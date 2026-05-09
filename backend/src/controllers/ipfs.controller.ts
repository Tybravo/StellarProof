import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ipfsService } from "../services/ipfs.service";
import type { IpfsUploadInput } from "../types/ipfs.types";

export class IpfsController {
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;
      if (!file) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "No file provided. Send a multipart/form-data request with a 'file' field.",
        });
        return;
      }

      const input: IpfsUploadInput = {
        content: file.buffer,
        name: file.originalname,
        metadata: { mimetype: file.mimetype },
      };

      const result = await ipfsService.upload(input);

      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async uploadJson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as Record<string, unknown>;
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: "Request body must be a JSON object.",
        });
        return;
      }

      const { name, metadata, ...payload } = body as {
        name?: string;
        metadata?: Record<string, string>;
        [key: string]: unknown;
      };

      const input: IpfsUploadInput = {
        content: payload,
        name: typeof name === "string" ? name : "document",
        metadata: metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? metadata
          : {},
      };

      const result = await ipfsService.upload(input);

      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const ipfsController = new IpfsController();
