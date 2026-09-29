import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import StorageRecord from '../models/StorageRecord.model';
import type { ContentHashCheckResult } from '../types/storage.types';
import { computeSha256, normalizeSha256Hex, sha256HexEquals } from '../utils/crypto';

/**
 * Content Hash Service
 * Guarantees that the hash a client computed (and will anchor on-chain as
 * `content_hash`) matches the bytes the server actually received, before any
 * storage write takes place.
 */
class ContentHashService {
  /**
   * Hashes the buffer and, when the client supplied a contentHash, verifies it.
   * Returns the server-computed SHA-256 hex digest.
   *
   * @throws AppError 400 INVALID_CONTENT_HASH when the supplied value is not a SHA-256 hex digest
   * @throws AppError 422 CONTENT_HASH_MISMATCH when the digest does not match the buffer
   */
  verify(buffer: Buffer, suppliedHash: unknown): string {
    const computedHash = computeSha256(buffer);

    if (suppliedHash === undefined || suppliedHash === null || suppliedHash === '') {
      return computedHash;
    }

    const expectedHash = typeof suppliedHash === 'string' ? normalizeSha256Hex(suppliedHash) : null;
    if (!expectedHash) {
      throw new AppError(
        'contentHash must be a 64-character SHA-256 hex digest (optionally prefixed with "sha256:" or "0x")',
        StatusCodes.BAD_REQUEST,
        'INVALID_CONTENT_HASH',
      );
    }

    if (!sha256HexEquals(expectedHash, computedHash)) {
      throw new AppError(
        `contentHash mismatch: supplied ${expectedHash}, computed ${computedHash} from the uploaded bytes`,
        StatusCodes.UNPROCESSABLE_ENTITY,
        'CONTENT_HASH_MISMATCH',
      );
    }

    return computedHash;
  }

  /**
   * Pre-upload check: requires a client contentHash, verifies it against the
   * buffer, and reports the caller's existing StorageRecords for that content.
   * Performs no writes.
   *
   * @throws AppError 400 CONTENT_HASH_REQUIRED when no contentHash was supplied
   */
  async checkUpload(
    buffer: Buffer,
    suppliedHash: unknown,
    userId: string,
  ): Promise<ContentHashCheckResult> {
    if (suppliedHash === undefined || suppliedHash === null || suppliedHash === '') {
      throw new AppError(
        'contentHash is required for hash verification',
        StatusCodes.BAD_REQUEST,
        'CONTENT_HASH_REQUIRED',
      );
    }

    const contentHash = this.verify(buffer, suppliedHash);

    const records = await StorageRecord.find({
      userId: new mongoose.Types.ObjectId(userId),
      contentHash,
    })
      .sort({ uploadedAt: -1 })
      .select('provider url cid publicId uploadedAt')
      .lean()
      .exec();

    return {
      contentHash,
      size: buffer.length,
      matches: true,
      alreadyStored: records.length > 0,
      existingRecords: records.map((record) => ({
        id: record._id.toString(),
        provider: record.provider,
        url: record.url,
        cid: record.cid,
        publicId: record.publicId,
        uploadedAt: record.uploadedAt,
      })),
    };
  }
}

export const contentHashService = new ContentHashService();
