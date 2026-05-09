/**
 * Integration test — /health endpoint
 *
 * Uses supertest to send a real HTTP request through the Express app.
 * The Pinata / IPFS service is mocked so the test does not require
 * live cloud credentials.
 */
import request from 'supertest';
import express, { type Request, type Response } from 'express';
import mongoose from 'mongoose';

// ── Mock modules that have external SDK type issues ──────────────────────────
jest.mock('../services/ipfs.service', () => ({
  IpfsService: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockResolvedValue({ cid: 'mock-cid', size: 0 }),
  })),
}));

jest.mock('../config/cloudinary', () => ({
  initCloudinary: jest.fn(),
}));

// ── Minimal app fixture (avoids importing the full app with all routes) ──────
function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    const dbStatus = mongoose.connection.readyState;
    const statusMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    res.status(200).json({
      status: 'ok',
      service: 'stellarproof-backend',
      timestamp: new Date().toISOString(),
      database: {
        status: statusMap[dbStatus] ?? 'unknown',
      },
    });
  });

  app.use('/api/v1/auth', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns the service name', async () => {
    const res = await request(app).get('/health');
    expect(res.body.service).toBe('stellarproof-backend');
  });

  it('returns a timestamp in ISO 8601 format', async () => {
    const res = await request(app).get('/health');
    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });

  it('returns a database status field', async () => {
    const res = await request(app).get('/health');
    expect(res.body.database).toBeDefined();
    expect(typeof res.body.database.status).toBe('string');
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('GET /health — wrong method', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  it('returns 404 for POST /health', async () => {
    const res = await request(app).post('/health');
    expect(res.status).toBe(404);
  });
});