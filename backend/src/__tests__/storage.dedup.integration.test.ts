/**
 * StorageRecord CID deduplication and asset linkage.
 *
 * Runs against a real MongoDB (mongodb-memory-server) so the unique cid
 * index, sparse behaviour and duplicate-key race handling are exercised by
 * the actual database engine. Only the external pinning providers are
 * stubbed; the stub derives the CID from the bytes, as IPFS does.
 */
jest.mock('../config/env', () => ({
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

jest.mock('../services/cloudinary.service', () => ({
  __esModule: true,
  cloudinaryService: { uploadBuffer: jest.fn() },
}));

import { createHash } from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import storageRoutes from '../routes/v1/storage.routes';
import { globalErrorHandler } from '../middlewares/errorHandler';
import StorageRecord from '../models/StorageRecord.model';
import Asset from '../models/Asset.model';
import Manifest from '../models/Manifest.model';
import { ipfsService } from '../services/ipfs.service';
import { cloudinaryService } from '../services/cloudinary.service';
import { storageOrchestratorService } from '../services/storage.service';
import type { IpfsUploadInput } from '../types/ipfs.types';

jest.setTimeout(60_000);

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const cidFor = (data: Buffer) => `bafkrei${sha256(data).slice(0, 52)}`;

let mongo: MongoMemoryServer;
let uploadSpy: jest.SpyInstance;

const userA = new mongoose.Types.ObjectId().toString();
const userB = new mongoose.Types.ObjectId().toString();

function ipfsRequest(buffer: Buffer, userId = userA, extra: Record<string, unknown> = {}) {
  return {
    storageProvider: 'ipfs' as const,
    buffer,
    mimetype: 'image/png',
    originalname: 'photo.png',
    userId,
    ...extra,
  };
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/storage', storageRoutes);
  app.use(globalErrorHandler);
  return app;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await StorageRecord.syncIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([StorageRecord.deleteMany({}), Asset.deleteMany({}), Manifest.deleteMany({})]);
  jest.restoreAllMocks();
  uploadSpy = jest.spyOn(ipfsService, 'upload').mockImplementation(async (input: IpfsUploadInput) => {
    const bytes = input.content as Buffer;
    const cid = cidFor(bytes);
    return {
      cid,
      cidVersion: 1 as const,
      size: bytes.length,
      name: input.name ?? 'upload',
      timestamp: new Date().toISOString(),
      gatewayUrl: `https://gateway.example/ipfs/${cid}`,
      pinId: `pin-${cid}`,
      pinningStatus: 'pinned' as const,
      availability: { available: true, httpStatus: 200, checkedAt: new Date().toISOString() },
    };
  });
});

describe('StorageRecord schema', () => {
  it('declares a unique, sparse index on cid', async () => {
    const indexes = await StorageRecord.collection.indexes();
    const cidIndex = indexes.find((index) => index.key.cid === 1);

    expect(cidIndex).toMatchObject({ unique: true, sparse: true });
  });

  it('rejects a second record with the same cid at the database level', async () => {
    const base = { userId: userA, provider: 'ipfs', size: 1, mimetype: 'text/plain', originalFilename: 'a.txt' };
    await StorageRecord.create({ ...base, cid: 'bafkreiduplicate', url: 'https://gateway.example/ipfs/1' });

    await expect(
      StorageRecord.create({ ...base, cid: 'bafkreiduplicate', url: 'https://gateway.example/ipfs/2' })
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('allows many records without a cid (Cloudinary uploads)', async () => {
    const base = { userId: userA, provider: 'cloudinary', size: 1, mimetype: 'image/png', originalFilename: 'a.png' };
    await StorageRecord.create({ ...base, url: 'https://res.cloudinary.com/1', publicId: 'p1' });
    await StorageRecord.create({ ...base, url: 'https://res.cloudinary.com/2', publicId: 'p2' });

    expect(await StorageRecord.countDocuments({ provider: 'cloudinary' })).toBe(2);
  });

  it('defaults kind to media and rejects unknown kinds', async () => {
    const base = { userId: userA, provider: 'ipfs', size: 1, mimetype: 'text/plain', originalFilename: 'a.txt' };
    const record = await StorageRecord.create({ ...base, cid: 'bafkreikind', url: 'https://gateway.example/ipfs/k' });

    expect(record.kind).toBe('media');
    await expect(
      StorageRecord.create({ ...base, kind: 'thumbnail', cid: 'bafkreikind2', url: 'https://gateway.example/ipfs/k2' })
    ).rejects.toBeInstanceOf(mongoose.Error.ValidationError);
  });
});

describe('storageOrchestratorService CID deduplication', () => {
  const bytes = Buffer.from('identical media bytes');

  it('pins new bytes once and persists cid, contentHash and kind', async () => {
    const result = await storageOrchestratorService.orchestrate(ipfsRequest(bytes));

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ cid: cidFor(bytes), kind: 'media', deduplicated: false });

    const stored = await StorageRecord.findById(result.recordId).lean();
    expect(stored).toMatchObject({ cid: cidFor(bytes), contentHash: sha256(bytes), kind: 'media' });
  });

  it('returns the existing record without re-pinning identical bytes', async () => {
    const first = await storageOrchestratorService.orchestrate(ipfsRequest(bytes));
    const second = await storageOrchestratorService.orchestrate(ipfsRequest(bytes, userB));

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ recordId: first.recordId, cid: first.cid, deduplicated: true });
    expect(await StorageRecord.countDocuments({ cid: first.cid })).toBe(1);
  });

  it('pins different bytes separately', async () => {
    const first = await storageOrchestratorService.orchestrate(ipfsRequest(bytes));
    const second = await storageOrchestratorService.orchestrate(ipfsRequest(Buffer.from('other bytes')));

    expect(uploadSpy).toHaveBeenCalledTimes(2);
    expect(second.cid).not.toBe(first.cid);
    expect(await StorageRecord.countDocuments()).toBe(2);
  });

  it('reuses and backfills a legacy record that has the CID but no contentHash', async () => {
    const legacy = await StorageRecord.create({
      userId: userA,
      provider: 'ipfs',
      cid: cidFor(bytes),
      url: `https://gateway.example/ipfs/${cidFor(bytes)}`,
      size: bytes.length,
      mimetype: 'image/png',
      originalFilename: 'legacy.png',
    });

    const result = await storageOrchestratorService.orchestrate(ipfsRequest(bytes));

    expect(result).toMatchObject({ recordId: legacy._id.toString(), deduplicated: true });
    expect(await StorageRecord.countDocuments()).toBe(1);
    expect((await StorageRecord.findById(legacy._id).lean())?.contentHash).toBe(sha256(bytes));
  });

  it('keeps a single record when identical bytes are uploaded concurrently', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => storageOrchestratorService.orchestrate(ipfsRequest(bytes)))
    );

    expect(await StorageRecord.countDocuments({ cid: cidFor(bytes) })).toBe(1);
    expect(new Set(results.map((r) => r.recordId)).size).toBe(1);
  });

  it('does not deduplicate Cloudinary uploads', async () => {
    const cloudinaryUpload = cloudinaryService.uploadBuffer as jest.Mock;
    cloudinaryUpload
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/a', public_id: 'a', bytes: 5, created_at: new Date().toISOString() })
      .mockResolvedValueOnce({ secure_url: 'https://res.cloudinary.com/b', public_id: 'b', bytes: 5, created_at: new Date().toISOString() });

    await storageOrchestratorService.orchestrate({ ...ipfsRequest(bytes), storageProvider: 'cloudinary' });
    await storageOrchestratorService.orchestrate({ ...ipfsRequest(bytes), storageProvider: 'cloudinary' });

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(await StorageRecord.countDocuments({ provider: 'cloudinary' })).toBe(2);
  });

  it('rejects an invalid assetId before contacting the provider', async () => {
    await expect(
      storageOrchestratorService.orchestrate(ipfsRequest(bytes, userA, { assetId: 'not-an-id' }))
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(uploadSpy).not.toHaveBeenCalled();
  });
});

describe('asset linkage', () => {
  const bytes = Buffer.from('linked media bytes');

  it('links a record to the first asset and keeps that link for later claims', async () => {
    const { recordId } = await storageOrchestratorService.orchestrate(ipfsRequest(bytes));
    const firstAsset = new mongoose.Types.ObjectId().toString();
    const secondAsset = new mongoose.Types.ObjectId().toString();

    const linked = await storageOrchestratorService.linkAsset(recordId!, firstAsset);
    const relinked = await storageOrchestratorService.linkAsset(recordId!, secondAsset);

    expect(linked.assetId).toBe(firstAsset);
    expect(relinked.assetId).toBe(firstAsset);
  });

  it('returns 404 when linking a missing record', async () => {
    await expect(
      storageOrchestratorService.linkAsset(new mongoose.Types.ObjectId().toString(), new mongoose.Types.ObjectId().toString())
    ).rejects.toMatchObject({ statusCode: 404, code: 'STORAGE_RECORD_NOT_FOUND' });
  });

  it('finds the owning asset from a sha256-prefixed media hash', async () => {
    const assetId = new mongoose.Types.ObjectId().toString();
    await storageOrchestratorService.orchestrate(ipfsRequest(bytes, userA, { assetId }));

    await expect(storageOrchestratorService.findAssetIdByContentHash(`sha256:${sha256(bytes)}`)).resolves.toBe(assetId);
    await expect(storageOrchestratorService.findAssetIdByContentHash(sha256(Buffer.from('unknown')))).resolves.toBeUndefined();
  });
});

describe('POST /api/v1/storage/media and /manifest', () => {
  const app = buildApp();
  const media = Buffer.from('PNG media payload for dedup');

  it('pins media once, links it to the first asset and reports deduplication', async () => {
    const first = await request(app)
      .post('/api/v1/storage/media')
      .field('userId', userA)
      .field('storageProvider', 'ipfs')
      .attach('file', media, { filename: 'photo.png', contentType: 'image/png' });
    const second = await request(app)
      .post('/api/v1/storage/media')
      .field('userId', userB)
      .field('storageProvider', 'ipfs')
      .attach('file', media, { filename: 'copy.png', contentType: 'image/png' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data).toMatchObject({ cid: cidFor(media), deduplicated: false });
    expect(second.body.data).toMatchObject({ cid: cidFor(media), deduplicated: true });
    expect(uploadSpy).toHaveBeenCalledTimes(1);

    const records = await StorageRecord.find({ cid: cidFor(media) }).lean();
    expect(records).toHaveLength(1);
    expect(records[0].assetId?.toString()).toBe(first.body.data.assetId);
  });

  it('records manifests as kind=manifest linked to the asset of the media they describe', async () => {
    const mediaRes = await request(app)
      .post('/api/v1/storage/media')
      .field('userId', userA)
      .field('storageProvider', 'ipfs')
      .attach('file', media, { filename: 'photo.png', contentType: 'image/png' });

    const manifest = await Manifest.create({
      contentHash: `sha256:${sha256(media)}`,
      creator: 'GCREATORPUBLICKEY',
      creatorId: userA,
      metadata: { description: 'dedup test' },
    });

    const res = await request(app).post('/api/v1/storage/manifest').send({ manifestId: manifest._id.toString() });

    expect(res.status).toBe(200);
    const record = await StorageRecord.findOne({ cid: res.body.data.cid }).lean();
    expect(record).toMatchObject({ kind: 'manifest', mimetype: 'application/json' });
    expect(record?.assetId?.toString()).toBe(mediaRes.body.data.assetId);
    expect((await Manifest.findById(manifest._id).lean())?.ipfsCid).toBe(res.body.data.cid);
    expect(uploadSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ manifestId: manifest._id.toString() }) })
    );
  });
});
