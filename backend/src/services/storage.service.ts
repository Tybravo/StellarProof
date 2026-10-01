import { computeSha256 } from '../utils/crypto';
import { createHash } from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError';
import {
  UploadRequest,
  UploadResult,
  StorageProvider,
  StorageError,
  ProviderHealthSnapshot,
  ProviderHealthStatus,
  STORAGE_PROVIDERS,
  CidResolutionResult,
} from '../types/storage.types';
import { cloudinaryService } from './cloudinary.service';
import { ipfsService } from './ipfs.service';
import StorageRecord from '../models/StorageRecord.model';
import StorageProviderHealth, { IStorageProviderHealth } from '../models/StorageProviderHealth.model';
import { env } from '../config/env';
import logger from '../utils/logger';

/** Provider-level upload outcome, before fallback bookkeeping is attached. */
type ProviderUpload = Omit<UploadResult, 'requestedProvider' | 'fallbackUsed'>;

interface ResolvedUpload {
  uploadResult: ProviderUpload;
  fallbackReason?: string;
}

/** Providers the orchestrator can route to. */
const CID_V0_PATTERN = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const CID_V1_BASE32_PATTERN = /^b[a-z2-7]{50,}$/;

export function isValidCid(cid: string): boolean {
  return CID_V0_PATTERN.test(cid) || CID_V1_BASE32_PATTERN.test(cid);
}

/** Mirrors the `maxlength` of StorageRecord.fallbackReason. */
const MAX_FALLBACK_REASON_LENGTH = 1000;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
const errorMessage = toErrorMessage;

type ProviderProbe = () => Promise<void>;

export interface StorageProviderRegistryOptions {
  priority: StorageProvider[];
  ttlMs: number;
  timeoutMs: number;
}

export function parseProviderPriority(value: string): StorageProvider[] {
  const priority = value
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider): provider is StorageProvider =>
      (STORAGE_PROVIDERS as readonly string[]).includes(provider)
    );
  const unique = Array.from(new Set(priority));
  for (const provider of STORAGE_PROVIDERS) {
    if (!unique.includes(provider)) unique.push(provider);
  }
  return unique;
}

async function withTimeout(probe: ProviderProbe, timeoutMs: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      probe(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class StorageProviderRegistry {
  private refreshInFlight: Promise<ProviderHealthSnapshot[]> | null = null;

  constructor(
    private readonly probes: Record<StorageProvider, ProviderProbe>,
    private readonly options: StorageProviderRegistryOptions,
  ) {}

  async checkProvider(provider: StorageProvider): Promise<IStorageProviderHealth> {
    const startedAt = Date.now();
    try {
      await withTimeout(this.probes[provider], this.options.timeoutMs);
      return await this.recordSuccess(provider, Date.now() - startedAt, 'probe');
    } catch (error) {
      return await this.recordFailure(provider, error, 'probe');
    }
  }

  async refresh(): Promise<ProviderHealthSnapshot[]> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = (async () => {
        try {
          const records = await Promise.all(this.options.priority.map((provider) => this.checkProvider(provider)));
          return this.rank(records);
        } finally {
          this.refreshInFlight = null;
        }
      })();
    }
    return this.refreshInFlight;
  }

  async getRankedProviders(options: { refreshIfStale?: boolean } = {}): Promise<ProviderHealthSnapshot[]> {
    const records = await StorageProviderHealth.find({ provider: { $in: this.options.priority } });
    if ((options.refreshIfStale ?? true) && this.isStale(records)) return this.refresh();
    return this.rank(records);
  }

  async getUploadCandidates(requested: StorageProvider): Promise<StorageProvider[]> {
    try {
      const ranked = await this.getRankedProviders();
      const byStatus = (status: ProviderHealthStatus) => {
        const group = ranked.filter((item) => item.status === status).map((item) => item.provider);
        return group.includes(requested) ? [requested, ...group.filter((provider) => provider !== requested)] : group;
      };
      return [...byStatus('healthy'), ...byStatus('unhealthy')];
    } catch (error) {
      logger.warn('Storage provider registry unavailable; using static priority', { error: errorMessage(error) });
      return [requested, ...this.options.priority.filter((provider) => provider !== requested)];
    }
  }

  async recordSuccess(
    provider: StorageProvider,
    latencyMs: number,
    source: 'probe' | 'upload',
  ): Promise<IStorageProviderHealth> {
    const now = new Date();
    const record = await StorageProviderHealth.findOneAndUpdate(
      { provider },
      {
        $set: { status: 'healthy', latencyMs, consecutiveFailures: 0, lastCheckedAt: now, lastHealthyAt: now, source },
        $unset: { lastError: 1 },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return record as IStorageProviderHealth;
  }

  async recordFailure(
    provider: StorageProvider,
    error: unknown,
    source: 'probe' | 'upload',
  ): Promise<IStorageProviderHealth> {
    const message = errorMessage(error).slice(0, 1000);
    logger.warn('Storage provider marked unhealthy', { provider, source, error: message });
    const record = await StorageProviderHealth.findOneAndUpdate(
      { provider },
      {
        $set: { status: 'unhealthy', lastError: message, lastCheckedAt: new Date(), source },
        $unset: { latencyMs: 1 },
        $inc: { consecutiveFailures: 1 },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return record as IStorageProviderHealth;
  }

  private isStale(records: IStorageProviderHealth[]): boolean {
    if (records.length < this.options.priority.length) return true;
    const cutoff = Date.now() - this.options.ttlMs;
    return records.some((record) => record.lastCheckedAt.getTime() < cutoff);
  }

  private rank(records: IStorageProviderHealth[]): ProviderHealthSnapshot[] {
    return [...records]
      .sort((left, right) => {
        if (left.status !== right.status) return left.status === 'healthy' ? -1 : 1;
        return this.options.priority.indexOf(left.provider) - this.options.priority.indexOf(right.provider);
      })
      .map((record, index) => ({
        provider: record.provider,
        rank: index + 1,
        status: record.status,
        latencyMs: record.latencyMs,
        consecutiveFailures: record.consecutiveFailures,
        lastError: record.lastError,
        lastCheckedAt: record.lastCheckedAt,
        lastHealthyAt: record.lastHealthyAt,
        source: record.source,
      }));
  }
}

export const storageProviderRegistry = new StorageProviderRegistry(
  { ipfs: () => ipfsService.healthCheck(), cloudinary: () => cloudinaryService.ping() },
  {
    priority: parseProviderPriority(env.STORAGE_PROVIDER_PRIORITY),
    ttlMs: env.STORAGE_HEALTH_TTL_MS,
    timeoutMs: env.STORAGE_HEALTH_CHECK_TIMEOUT_MS,
  },
);

function isDuplicateKeyError(error: unknown, fields: string[]): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 11000) {
    return false;
  }
  const keyPattern = 'keyPattern' in error ? error.keyPattern : undefined;
  return (
    typeof keyPattern === 'object' &&
    keyPattern !== null &&
    Object.keys(keyPattern).some((key) => fields.includes(key))
  );
}

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
   *
   * IPFS uploads are content-addressed and deduplicated: if the same bytes
   * were already pinned, the existing StorageRecord is returned and the
   * provider is not called again. If the provider returns a CID that already
   * has a record (legacy record without contentHash, or a concurrent upload),
   * that record is reused instead of creating a duplicate.
   */
  async orchestrate(request: UploadRequest): Promise<UploadResult> {
    if (!STORAGE_PROVIDERS.includes(request.storageProvider)) {
      throw new StorageError(
        null,
        'orchestrate',
        `Invalid storage provider: ${request.storageProvider}. Supported providers: ${STORAGE_PROVIDERS.join(', ')}`,
        400,
      );
    }

    if (request.assetId && !mongoose.Types.ObjectId.isValid(request.assetId)) {
      throw new StorageError(request.storageProvider, 'orchestrate', 'Invalid assetId', 400);
    }

    const contentHash = computeSha256(request.buffer);

    if (request.storageProvider === 'ipfs') {
      const existing = await this.findExistingRecord({ provider: 'ipfs', contentHash }, request.storageProvider);
      if (existing) {
        return this.reuseRecord(existing, request, contentHash);
      }
    }

    const candidates = request.storageProvider === 'cloudinary' || request.allowFallback === false
      ? [request.storageProvider]
      : await this.registry.getUploadCandidates(request.storageProvider);
    const failures: string[] = [];
    let uploadResult: ProviderUpload | undefined;
    let fallbackReason: string | undefined;

    for (const provider of candidates) {
      const startedAt = Date.now();
      try {
        uploadResult = await this.uploadToProvider(provider, request);
        await this.registry.recordSuccess(provider, Date.now() - startedAt, 'upload').catch((error: unknown) => {
          logger.warn('Failed to record storage provider success', { provider, error: errorMessage(error) });
        });
        break;
      } catch (error) {
        if (error instanceof AppError && error.statusCode < 500) {
          throw new StorageError(provider, 'upload', error.message, error.statusCode);
        }

        const reason = errorMessage(error).slice(0, MAX_FALLBACK_REASON_LENGTH);
        failures.push(`${provider}: ${reason}`);
        fallbackReason ??= reason;
        await this.registry.recordFailure(provider, error, 'upload').catch((recordError: unknown) => {
          logger.warn('Failed to record storage provider failure', {
            provider,
            error: errorMessage(recordError),
          });
        });
      }
    }

    if (!uploadResult) {
      const allCloudinary = failures.length === 1 && failures[0].startsWith('cloudinary:');
      throw new StorageError(
        request.storageProvider,
        'upload',
        failures.join('; '),
        allCloudinary ? 502 : 503,
      );
    }

    const failedOver = uploadResult.provider !== request.storageProvider;
    if (failedOver) {
      logger.warn('IPFS upload failed; falling back to Cloudinary', {
        originalFilename: request.originalname,
        userId: request.userId,
        reason: fallbackReason,
      });
    }

    if (uploadResult.cid) {
      const existing = await this.findExistingRecord({ cid: uploadResult.cid }, request.storageProvider);
      if (existing) return this.reuseRecord(existing, request, contentHash);
    }

    const storageRecord = new StorageRecord({
      userId: request.userId,
      assetId: request.assetId,
      kind: request.kind ?? 'media',
      provider: uploadResult.provider,
      url: uploadResult.url,
      cid: uploadResult.cid,
      publicId: uploadResult.publicId,
      requestedProvider: request.storageProvider,
      fallbackUsed: failedOver,
      fallbackFrom: failedOver ? request.storageProvider : undefined,
      fallbackReason: failedOver ? fallbackReason : undefined,
      size: uploadResult.size,
      mimetype: uploadResult.mimetype,
      contentHash,
      originalFilename: request.originalname,
      uploadedAt: uploadResult.uploadedAt,
      pinningStatus: uploadResult.pinningStatus,
      availability: uploadResult.availability,
    });

    try {
      const savedRecord = await storageRecord.save();
      return this.toUploadResult(savedRecord, request.storageProvider, false);
    } catch (dbError) {
      if (uploadResult.cid && isDuplicateKeyError(dbError, ['cid', 'url'])) {
        const winner = await this.findExistingRecord({ cid: uploadResult.cid }, request.storageProvider);
        if (winner) return this.reuseRecord(winner, request, contentHash);
      }
      throw new StorageError(
        uploadResult.provider,
        'persist',
        `Failed to persist upload record to database: ${errorMessage(dbError)}`,
        500,
      );
    }
  }

  async linkAsset(recordId: string, assetId: string): Promise<UploadResult> {
    if (!mongoose.Types.ObjectId.isValid(recordId) || !mongoose.Types.ObjectId.isValid(assetId)) {
      throw new AppError('Invalid recordId or assetId', 400, 'INVALID_OBJECT_ID');
    }
    const linked = await StorageRecord.findOneAndUpdate(
      { _id: recordId, assetId: null },
      { $set: { assetId } },
      { new: true },
    ).exec();
    const record = linked ?? await StorageRecord.findById(recordId).exec();
    if (!record) throw new AppError('Storage record not found', 404, 'STORAGE_RECORD_NOT_FOUND');
    return this.toUploadResult(record, record.requestedProvider ?? record.provider, false);
  }

  async findAssetIdByContentHash(hash: string): Promise<string | undefined> {
    const contentHash = hash.trim().toLowerCase().replace(/^sha256:/, '');
    if (!/^[a-f0-9]{64}$/.test(contentHash)) return undefined;
    const record = await StorageRecord.findOne({ contentHash, assetId: { $exists: true, $ne: null } })
      .select('assetId')
      .lean()
      .exec();
    return record?.assetId?.toString();
  }

  async resolveCid(cid: string): Promise<CidResolutionResult> {
    if (!isValidCid(cid)) {
      throw new AppError('Invalid IPFS CID format', 400, 'INVALID_CID');
    }
    const record = await StorageRecord.findOne({ cid })
      .sort({ createdAt: -1 })
      .select('cid contentHash size')
      .exec();
    if (!record) throw new AppError(`No storage record found for CID ${cid}`, 404, 'CID_NOT_FOUND');

    const fetchResult = await ipfsService.fetchFromGateway(cid, {
      timeoutMs: env.IPFS_RESOLVE_TIMEOUT_MS,
      maxBytes: env.IPFS_RESOLVE_MAX_BYTES,
    });
    const base = {
      cid,
      expectedSize: record.size,
      gatewayStatus: fetchResult.status,
      checkedAt: new Date(),
    };

    switch (fetchResult.status) {
      case 'ok': {
        const storedHash = record.contentHash?.trim().toLowerCase().replace(/^sha256:/, '');
        return {
          ...base,
          available: true,
          size: fetchResult.size,
          hashMatches: storedHash ? storedHash === fetchResult.sha256 : null,
        };
      }
      case 'too_large':
        return { ...base, available: true, size: fetchResult.declaredSize, hashMatches: null };
      case 'not_found':
      case 'timeout':
      case 'unreachable':
        return { ...base, available: false, size: null, hashMatches: null };
    }
  }

  private async findExistingRecord(filter: Record<string, unknown>, provider: StorageProvider) {
    if (typeof StorageRecord.findOne !== 'function') return null;
    return this.runDbOperation(provider, 'dedup-lookup', () =>
      StorageRecord.findOne(filter).sort({ createdAt: 1 }).exec()
    );
  }

  private async runDbOperation<T>(provider: StorageProvider, operation: string, callback: () => Promise<T>): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      throw new StorageError(provider, operation, errorMessage(error), 500);
    }
  }

  private async reuseRecord(record: any, request: UploadRequest, contentHash: string): Promise<UploadResult> {
    if (!record.contentHash) {
      record.contentHash = contentHash;
      await record.save();
    }
    if (request.assetId && !record.assetId) {
      record.assetId = request.assetId;
      await record.save();
    }
    return this.toUploadResult(record, request.storageProvider, true);
  }

  private toUploadResult(record: any, requestedProvider: StorageProvider, deduplicated: boolean): UploadResult {
    const failedOver = record.provider !== requestedProvider;
    return {
      recordId: String(record._id),
      provider: record.provider,
      requestedProvider: record.requestedProvider ?? requestedProvider,
      fallbackUsed: record.fallbackUsed ?? failedOver,
      failedOver,
      url: record.url,
      cid: record.cid,
      publicId: record.publicId,
      fallbackFrom: record.fallbackFrom,
      kind: record.kind,
      assetId: record.assetId?.toString(),
      size: record.size,
      mimetype: record.mimetype,
      contentHash: record.contentHash,
      uploadedAt: record.uploadedAt,
      deduplicated,
      ...(record.provider === 'ipfs' && record.cid ? { gatewayUrl: record.url } : {}),
      ...(record.pinningStatus ? { pinningStatus: record.pinningStatus } : {}),
      ...(record.availability ? { availability: record.availability } : {}),
    };
  }

  /**
   * Routes to one provider. IPFS retries and pin timeouts are handled by the
   * IPFS adapter and `withIpfsTimeout`; cross-provider fallback stays in the
   * registry-driven orchestration loop.
   */
  private async uploadToProvider(provider: StorageProvider, request: UploadRequest): Promise<ProviderUpload> {
    switch (provider) {
      case 'cloudinary':
        return this.uploadToCloudinary(request);
      case 'ipfs':
        return this.uploadToIpfs(request);
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
        ...(request.metadata ? { metadata: request.metadata } : {}),
      }),
      request,
    );

    return {
      provider: 'ipfs',
      url: ipfsUpload.gatewayUrl,
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

export const storageOrchestratorService = new StorageOrchestratorService(storageProviderRegistry);