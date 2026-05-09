import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import Certificate, { type ICertificate } from "../models/Certificate.model";
import { AppError } from "../errors/AppError";
import type {
  ListCertificatesQuery,
  CertificateListResult,
} from "../types/certificate.types";

export class CertificateService {
  async listCertificates(query: ListCertificatesQuery): Promise<CertificateListResult> {
    const { creatorId, limit, skip } = query;

    if (!mongoose.Types.ObjectId.isValid(creatorId)) {
      throw new AppError(
        "creatorId must be a valid MongoDB ObjectId",
        StatusCodes.BAD_REQUEST,
        "INVALID_CREATOR_ID"
      );
    }

    if (limit < 1 || limit > 100) {
      throw new AppError(
        "limit must be between 1 and 100",
        StatusCodes.BAD_REQUEST,
        "INVALID_PAGINATION"
      );
    }

    if (skip < 0) {
      throw new AppError(
        "skip must be a non-negative integer",
        StatusCodes.BAD_REQUEST,
        "INVALID_PAGINATION"
      );
    }

    const filter = { creatorId: new mongoose.Types.ObjectId(creatorId) };

    const [certificates, total] = await Promise.all([
      Certificate.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Record<string, unknown>[]>(),
      Certificate.countDocuments(filter),
    ]);

    return { certificates, total, limit, skip };
  }

  async getCertificateById(id: string): Promise<ICertificate | null> {
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ _id: id }, { certificateId: id }] }
      : { certificateId: id };

    return Certificate.findOne(query)
      .populate("manifestId")
      .populate("assetId")
      .exec();
  }
}

export const certificateService = new CertificateService();
