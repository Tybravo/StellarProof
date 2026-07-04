import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { SPVModel } from "../models/spv.model";
import ManifestModel, { IManifest } from "../models/Manifest.model";
import { AppError } from "../errors/AppError";
import type { IUser } from "../models/User.model";
import type {
  IManifestEntry,
  ListManifestsQuery,
  ManifestListResult,
} from "../types/manifest.types";

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;

const createManifestBodySchema = z.object({
  contentHash: z.string().min(1, "contentHash is required"),
  creator: z
    .string()
    .regex(STELLAR_PUBLIC_KEY_REGEX, "Invalid Stellar public key (G...)")
    .optional(),
  timestamp: z
    .preprocess((value) => {
      if (typeof value === "string") {
        return new Date(value);
      }
      return value;
    }, z.date().refine((date) => !Number.isNaN(date.getTime()), {
      message: "Invalid timestamp",
    }))
    .optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

const EXCLUDED_FIELDS = { encryptedPayload: 0 } as const;

class ManifestService {
  /**
   * Returns a paginated list of manifests owned by the given Stellar public key.
   */
  public async listManifests(query: ListManifestsQuery): Promise<ManifestListResult> {
    const { ownerPublicKey, limit, skip } = query;

    if (limit < 1 || limit > 100) {
      throw new AppError("limit must be between 1 and 100", StatusCodes.BAD_REQUEST, "INVALID_PAGINATION");
    }

    if (skip < 0) {
      throw new AppError("skip must be a non-negative integer", StatusCodes.BAD_REQUEST, "INVALID_PAGINATION");
    }

    const filter = { ownerPublicKey };

    const [manifests, total] = await Promise.all([
      SPVModel.find(filter, EXCLUDED_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IManifestEntry[]>(),
      SPVModel.countDocuments(filter),
    ]);

    return { manifests, total, limit, skip };
  }

  public prepareManifestPayload(payload: unknown, user: IUser): Partial<IManifest> {
    const result = createManifestBodySchema.safeParse(payload);
    if (!result.success) {
      throw new AppError(
        "Invalid manifest payload",
        StatusCodes.BAD_REQUEST,
        "INVALID_MANIFEST_PAYLOAD"
      );
    }

    const { contentHash, creator, timestamp, metadata } = result.data;
    const userPublicKey = user.stellarPublicKey;

    if (userPublicKey && creator && creator !== userPublicKey) {
      throw new AppError(
        "Creator public key does not match authenticated user",
        StatusCodes.FORBIDDEN,
        "CREATOR_MISMATCH"
      );
    }

    const effectiveCreator = userPublicKey ?? creator;
    if (!effectiveCreator) {
      throw new AppError(
        "Creator public key is required when the authenticated user has no connected wallet",
        StatusCodes.BAD_REQUEST,
        "CREATOR_REQUIRED"
      );
    }

    return {
      contentHash,
      creator: effectiveCreator,
      creatorId: user.id,
      timestamp: timestamp ?? new Date(),
      metadata,
    };
  }

  /**
   * Recursively sanitizes dynamic objects.
   * - Strips HTML/XML tags to prevent XSS.
   * - Truncates strings to 1000 characters to prevent DB bloat.
   */
  private sanitizePayload(val: unknown): unknown {
    if (typeof val === 'string') {
      const sanitized = val.replace(/<[^>]*>?/gm, '');
      return sanitized.substring(0, 1000);
    }
    if (Array.isArray(val)) {
      return val.map((item) => this.sanitizePayload(item));
    }
    if (val !== null && typeof val === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(val)) {
        sanitizedObj[key] = this.sanitizePayload(value);
      }
      return sanitizedObj;
    }
    return val;
  }

  /**
   * Validates, sanitizes, and saves a manifest payload.
   */
  public async processManifest(payload: any): Promise<IManifest> {
    if (!payload || !payload.creator || !payload.creatorId || !payload.contentHash || !payload.timestamp) {
      throw new Error('Validation Error: "contentHash", "creator", "creatorId", and "timestamp" are strictly required.');
    }

    const sanitizedMetadata = this.sanitizePayload(payload.metadata || {});

    const newManifest = new ManifestModel({
      contentHash: payload.contentHash,
      creator: payload.creator,
      creatorId: payload.creatorId,
      timestamp: new Date(payload.timestamp),
      metadata: sanitizedMetadata,
    });

    return await newManifest.save();
  }
}

export const manifestService = new ManifestService();