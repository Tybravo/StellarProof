/**
 * Storage orchestrator fallback path: IPFS -> Cloudinary.
 *
 * Drives POST /api/v1/storage/upload through supertest against a real
 * MongoDB (mongodb-memory-server). The IPFS provider is forced to fail at
 * the SDK boundary; the orchestrator must fall back to Cloudinary, return a
 * unified UploadResult and persist the provider that actually stored the
 * bytes on the StorageRecord.
 */
jest.mock('../../config/env', () => ({
  __esModule: true,
  env: {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test-secret',
    CLOUDINARY_CLOUD_NAME: 'test',
    CLOUDINARY_API_KEY: 'test',
    CLOUDINARY_API_SECRET: 'test',
    PINATA_JWT: 'test',
    PINATA_GATEWAY_URL: 'https://gateway.example/ipfs',
    IPFS_RESOLVE_TIMEOUT_MS: 1000,
    IPFS_RESOLVE_MAX_BYTES: 1024,
  },
}));

jest.mock('../cloudinary.service', () => ({
  __esModule: true,
  cloudinaryService: { uploadBuffer: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { StatusCodes } from 'http-status-codes';
// import { MongoMemoryServer } from 'mongodb-memory-server';
import storageRoutes from '../../routes/v1/storage.routes';
import { globalErrorHandler } from '../../middlewares/errorHandler';
import StorageRecord from '../../models/StorageRecord.model';
import Manifest from '../../models/Manifest.model';
import { AppError } from '../../errors/AppError';
import { ipfsService } from '../ipfs.service';
import { cloudinaryService } from '../cloudinary.service';
import logger from '../../utils/logger';

jest.setTimeout(60_000);

const cloudinaryUpload = cloudinaryService.uploadBuffer as jest.Mock;
const userId = new mongoose.Types.ObjectId().toString();
const fileBytes = Buffer.from('fallback payload bytes');

let mongo: any; // MongoMemoryServer;
let ipfsUpload: jest.SpyInstance;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/storage', storageRoutes);
  app.use(globalErrorHandler);
  return app;
}

function uploadVia(app: express.Express, storageProvider: string) {
  return request(app)
    .post('/api/v1/storage/upload')
    .field('userId', userId)
    .field('storageProvider', storageProvider)
    .attach('file', fileBytes, { filename: 'evidence.jpg', contentType: 'image/jpeg' });
}

function cloudinaryResponse(publicId = 'stellarproof/evidence') {
  return {
    secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${publicId}.jpg`,
    public_id: publicId,
    bytes: fileBytes.length,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const ipfsOutage = () =>
  new AppError('IPFS upload failed: Pinata responded 503', StatusCodes.BAD_GATEWAY, 'IPFS_UPLOAD_FAILED');

beforeAll(async () => {
  // mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await StorageRecord.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([StorageRecord.deleteMany({}), Manifest.deleteMany({})]);
  jest.clearAllMocks();
  ipfsUpload?.mockRestore();
  ipfsUpload = jest.spyOn(ipfsService, 'upload');
});

describe('POST /api/v1/storage/upload - IPFS to Cloudinary fallback', () => {
  const app = buildApp();

  it('falls back to Cloudinary when the IPFS provider fails', async () => {
    ipfsUpload.mockRejectedValue(ipfsOutage());
    cloudinaryUpload.mockResolvedValue(cloudinaryResponse());

    const res = await uploadVia(app, 'ipfs');

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(ipfsUpload).toHaveBeenCalledTimes(1);
    expect(cloudinaryUpload).toHaveBeenCalledTimes(1);
    expect(cloudinaryUpload).toHaveBeenCalledWith(fileBytes);
    expect(logger.warn).toHaveBeenCalledWith(
      'IPFS upload failed; falling back to Cloudinary',
      expect.objectContaining({ reason: expect.stringContaining('Pinata responded 503') })
    );
  });

  it('returns a unified UploadResult describing the provider that stored the bytes', async () => {
    ipfsUpload.mockRejectedValue(ipfsOutage());
    cloudinaryUpload.mockResolvedValue(cloudinaryResponse());

    const res = await uploadVia(app, 'ipfs');

    expect(res.body).toEqual({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        recordId: expect.any(String),
        provider: 'cloudinary',
        fallbackFrom: 'ipfs',
        url: cloudinaryResponse().secure_url,
        publicId: 'stellarproof/evidence',
        kind: 'media',
        size: fileBytes.length,
        mimetype: 'image/jpeg',
        uploadedAt: '2026-01-01T00:00:00.000Z',
        deduplicated: false,
      },
    });
    expect(res.body.data).not.toHaveProperty('cid');
  });

  it('persists the active provider (cloudinary) on the StorageRecord', async () => {
    ipfsUpload.mockRejectedValue(ipfsOutage());
    cloudinaryUpload.mockResolvedValue(cloudinaryResponse());

    const res = await uploadVia(app, 'ipfs');
    const records = await StorageRecord.find({}).lean();

    expect(records).toHaveLength(1);
    expect(records[0]._id.toString()).toBe(res.body.data.recordId);
    expect(records[0]).toMatchObject({
      provider: 'cloudinary',
      fallbackFrom: 'ipfs',
      publicId: 'stellarproof/evidence',
      url: cloudinaryResponse().secure_url,
      originalFilename: 'evidence.jpg',
      size: fileBytes.length,
    });
    expect(records[0].cid).toBeUndefined();
    expect(records[0].userId.toString()).toBe(userId);
  });

  it('also falls back on unexpected IPFS errors (network failure)', async () => {
    ipfsUpload.mockRejectedValue(new TypeError('fetch failed'));
    cloudinaryUpload.mockResolvedValue(cloudinaryResponse('network-fallback'));

    const res = await uploadVia(app, 'ipfs');

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.data).toMatchObject({ provider: 'cloudinary', fallbackFrom: 'ipfs' });
  });

  it('returns 502 and persists nothing when IPFS and the Cloudinary fallback both fail', async () => {
    ipfsUpload.mockRejectedValue(ipfsOutage());
    cloudinaryUpload.mockRejectedValue(new Error('Cloudinary quota exceeded'));

    const res = await uploadVia(app, 'ipfs');

    expect(res.status).toBe(StatusCodes.BAD_GATEWAY);
    expect(res.body).toMatchObject({
      success: false,
      code: 'STORAGE_ERROR',
      provider: 'cloudinary',
      operation: 'fallback',
    });
    expect(res.body.error).toEqual(expect.stringContaining('Pinata responded 503'));
    expect(res.body.error).toEqual(expect.stringContaining('Cloudinary quota exceeded'));
    expect(await StorageRecord.countDocuments()).toBe(0);
  });

  it('does not invoke Cloudinary when IPFS succeeds', async () => {
    ipfsUpload.mockResolvedValue({
      cid: 'bafkreifallbacknotneeded',
      size: fileBytes.length,
      name: 'evidence.jpg',
      timestamp: '2026-01-01T00:00:00.000Z',
      gatewayUrl: 'https://gateway.example/ipfs/bafkreifallbacknotneeded',
    });

    const res = await uploadVia(app, 'ipfs');

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(cloudinaryUpload).not.toHaveBeenCalled();
    expect(res.body.data).toMatchObject({ provider: 'ipfs', cid: 'bafkreifallbacknotneeded' });
    expect(res.body.data).not.toHaveProperty('fallbackFrom');
    expect(await StorageRecord.findOne({}).lean()).toMatchObject({ provider: 'ipfs' });
  });

  it('does not fall back for uploads that requested Cloudinary directly', async () => {
    cloudinaryUpload.mockRejectedValue(new Error('Cloudinary unavailable'));

    const res = await uploadVia(app, 'cloudinary');

    expect(res.status).toBe(StatusCodes.BAD_GATEWAY);
    expect(res.body).toMatchObject({ success: false, provider: 'cloudinary', operation: 'orchestrate' });
    expect(ipfsUpload).not.toHaveBeenCalled();
    expect(cloudinaryUpload).toHaveBeenCalledTimes(1);
    expect(await StorageRecord.countDocuments()).toBe(0);
  });
});

describe('POST /api/v1/storage/manifest - no fallback', () => {
  const app = buildApp();

  it('keeps manifests on IPFS: fails with 502 instead of falling back', async () => {
    ipfsUpload.mockRejectedValue(ipfsOutage());
    const manifest = await Manifest.create({
      contentHash: 'sha256:' + 'a'.repeat(64),
      creator: 'GCREATORPUBLICKEY',
      creatorId: userId,
      metadata: { description: 'fallback test' },
    });

    const res = await request(app).post('/api/v1/storage/manifest').send({ manifestId: manifest._id.toString() });

    expect(res.status).toBe(StatusCodes.BAD_GATEWAY);
    expect(cloudinaryUpload).not.toHaveBeenCalled();
    expect(await StorageRecord.countDocuments()).toBe(0);
    expect((await Manifest.findById(manifest._id).lean())?.ipfsCid).toBeUndefined();
  });
});
