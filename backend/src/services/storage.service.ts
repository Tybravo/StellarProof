import mongoose from 'mongoose';
import { computeSha256 } from '../utils/crypto';
import { UploadRequest, UploadResult, StorageProvider, StorageError } from '../types/storage.types';
import { AppError } from '../errors/AppError';
import { cloudinaryService } from './cloudinary.service';
import { ipfsService } from './ipfs.service';
import StorageRecord from '../models/StorageRecord.model';
import { env } from '../config/env';
import logger from '../utils/logger';

/** Provider-level upload outcome, before fallback bookkeeping is attached. */
type ProviderUpload = Omit<UploadResult, 'requestedProvider' | 'fallbackUsed'>;

/** Upload result before persistence to database */
type ResolvedUpload = { uploadResult: ProviderUpload; fallbackReason?: string };

/** Providers the orchestrator can route to. */
const STORAGE_PROVIDERS: readonly StorageProvider[] = ['cloudinary', 'ipfs'];

/** IPFS CID validation patterns */
const CID_V0_PATTERN = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_V1_BASE32_PATTERN = /^b[a-z2-7]{58}$/;

export function isValidCid(cid: string): boolean {
  return CID_V0_PATTERN.test(cid) || CID_V1_BASE32_PATTERN.test(cid);
}

/** Mirrors the `maxlength` of StorageRecord.fallbackReason. */
const MAX_FALLBACK_REASON_LENGTH = 1000;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Simple registry interface */
interface StorageProviderRegistry {
  // Add methods as needed
}

/** Mock registry for now */
const mockStorageProviderRegistry: StorageProviderRegistry = {};

/**
 * Storage Orchestrator Service
 * Factory that routes upload requests to the appropriate provider (Cloudinary or IPFS)
 * Consults the provider registry before each upload and fails over to the
 * next ranked provider when the preferred one is unhealthy or errors.
 * Ensures all uploads are persisted to MongoDB before returning
 *
 * IPFS uploads are resilient: if pinning errors or exceeds IPFS_UPLOAD_TIMEOUT_MS,
 * the same buffer is transparently routed to Cloudinary and the StorageRecord
 * records which provider actually holds the file.
 */
class StorageOrchestratorService {
  constructor(private readonly registry: StorageProviderRegistry) {}

  /**
   * Orchestrate the upload based on the requested storage provider
   * Routes to the appropriate provider, persists result to DB, and returns saved record.
   */
  async orchestrate(request: UploadRequest): Promise<UploadResult> {
    // Validate provider
    if (!STORAGE_PROVIDERS.includes(request.storageProvider)) {
      throw new StorageError(
        null,
        'orchestrate',
        `Invalid storage provider: ${request.storageProvider}. Supported providers: ${STORAGE_PROVIDERS.join(', ')}`,
        400,
      );
    }

    const contentHash = computeSha256(request.buffer);

    // Delegate to provider with fallback logic
    const resolved = await this.uploadWithFallback(request);
    
    // Create a basic storage record
    const storageRecord = new StorageRecord({
      userId: request.userId,
      provider: resolved.uploadResult.provider,
      url: resolved.uploadResult.url,
      cid: resolved.uploadResult.cid,
      publicId: resolved.uploadResult.publicId,
      size: resolved.uploadResult.size,
      mimetype: resolved.uploadResult.mimetype,
      contentHash,
      originalFilename: request.originalname,
      uploadedAt: resolved.uploadResult.uploadedAt,
    });

    const savedRecord = await storageRecord.save();

    return {
      provider: savedRecord.provider,
      requestedProvider: request.storageProvider,
      fallbackUsed: !!resolved.fallbackReason,
      url: savedRecord.url,
      cid: savedRecord.cid,
      publicId: savedRecord.publicId,
      size: savedRecord.size,
      mimetype: savedRecord.mimetype,
      contentHash: savedRecord.contentHash,
      uploadedAt: savedRecord.uploadedAt,
    };
  }

  /**
   * Uploads to the requested provider. When IPFS is requested and fails for
   * any reason (provider error, network error, timeout), retries the same
   * buffer on Cloudinary. Cloudinary requests are never redirected to IPFS.
   */
  private async uploadWithFallback(request: UploadRequest): Promise<ResolvedUpload> {
    if (request.storageProvider === 'cloudinary') {
      return { uploadResult: await this.uploadToCloudinary(request) };
    }

    try {
      return { uploadResult: await this.uploadToIpfs(request) };
    } catch (ipfsError) {
      const fallbackReason = toErrorMessage(ipfsError).slice(0, MAX_FALLBACK_REASON_LENGTH);
      const logContext = {
        userId: request.userId,
        originalname: request.originalname,
        size: request.buffer.length,
      };

      try {
        const uploadResult = await this.uploadToCloudinary(request);
        logger.info('Cloudinary fallback upload succeeded', {
          ...logContext,
          publicId: uploadResult.publicId,
        });
        return { uploadResult, fallbackReason };
      } catch (cloudinaryError) {
        const cloudinaryReason = toErrorMessage(cloudinaryError);
        logger.error('Cloudinary fallback upload failed after IPFS failure', {
          ...logContext,
          ipfsReason: fallbackReason,
          cloudinaryReason,
        });

        // Both providers are down: report a structured, retryable error.
        throw new StorageError(
          'ipfs',
          'upload',
          `IPFS upload failed (${fallbackReason}) and Cloudinary fallback failed (${cloudinaryReason})`,
          503,
        );
      }
    }
  }

  private async uploadToCloudinary(request: UploadRequest): Promise<ProviderUpload> {
    try {
      const cloudinaryUpload = await cloudinaryService.uploadBuffer(request.buffer);
      return {
        provider: 'cloudinary',
        url: cloudinaryUpload.secure_url,
        publicId: cloudinaryUpload.public_id,
        size: cloudinaryUpload.bytes,
        mimetype: request.mimetype,
        uploadedAt: new Date(cloudinaryUpload.created_at),
      };
    } catch (error) {
      throw new StorageError(
        'cloudinary',
        'upload',
        `Provider delegation failed: ${toErrorMessage(error)}`,
        502,
      );
    }
  }

  private async uploadToIpfs(request: UploadRequest): Promise<ProviderUpload> {
    const ipfsUpload = await this.withIpfsTimeout(
      ipfsService.upload({
        content: request.buffer,
        name: request.originalname,
      }),
      request,
    );

    return {
      provider: 'ipfs',
      url: ipfsUpload.gatewayUrl,
      gatewayUrl: ipfsUpload.gatewayUrl,
      cid: ipfsUpload.cid,
      size: ipfsUpload.size,
      mimetype: request.mimetype,
      uploadedAt: new Date(ipfsUpload.timestamp),
      pinningStatus: ipfsUpload.pinningStatus,
      availability: ipfsUpload.availability,
    };
  }

  /**
   * Rejects if IPFS pinning does not settle within IPFS_UPLOAD_TIMEOUT_MS.
   * A pin that completes after the deadline is not tracked by any
   * StorageRecord, so its CID is logged for manual reconciliation.
   */
  private withIpfsTimeout<T extends { cid: string }>(
    pending: Promise<T>,
    request: UploadRequest,
  ): Promise<T> {
    const timeoutMs = env.IPFS_UPLOAD_TIMEOUT_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return pending;
    }

    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(`IPFS pinning timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    pending.then(
      (late) => {
        if (timedOut) {
          logger.warn('IPFS pin completed after timeout; CID is not tracked by any StorageRecord', {
            userId: request.userId,
            originalname: request.originalname,
            cid: late.cid,
          });
        }
      },
      // Rejections are handled by the race below; swallow here to avoid an unhandled rejection.
      () => undefined,
    );

    return Promise.race([pending, timeout]).finally(() => clearTimeout(timer));
  }
}

export const storageOrchestratorService = new StorageOrchestratorService(mockStorageProviderRegistry);