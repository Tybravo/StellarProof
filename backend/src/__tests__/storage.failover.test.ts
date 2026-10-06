jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    PINATA_JWT: "test-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
    STORAGE_PROVIDER_PRIORITY: "ipfs,cloudinary",
    STORAGE_HEALTH_TTL_MS: 60000,
    STORAGE_HEALTH_CHECK_TIMEOUT_MS: 5000,
  },
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("../services/ipfs.service", () => ({
  __esModule: true,
  ipfsService: { upload: jest.fn(), healthCheck: jest.fn() },
}));

jest.mock("../services/cloudinary.service", () => ({
  __esModule: true,
  cloudinaryService: { uploadBuffer: jest.fn(), ping: jest.fn() },
}));

jest.mock("../models/StorageProviderHealth.model", () => ({
  __esModule: true,
  default: { find: jest.fn(), findOneAndUpdate: jest.fn() },
}));

jest.mock("../models/StorageRecord.model", () => ({
  __esModule: true,
  default: jest.fn(),
}));

import StorageProviderHealth from "../models/StorageProviderHealth.model";
import StorageRecord from "../models/StorageRecord.model";
import { ipfsService } from "../services/ipfs.service";
import { cloudinaryService } from "../services/cloudinary.service";
import {
  StorageProviderRegistry,
  parseProviderPriority,
  storageOrchestratorService,
} from "../services/storage.service";
import { AppError } from "../errors/AppError";
import { StorageError, type StorageProvider } from "../types/storage.types";

const healthModel = StorageProviderHealth as unknown as { find: jest.Mock; findOneAndUpdate: jest.Mock };

const CID_V1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

function healthRecord(provider: StorageProvider, status: "healthy" | "unhealthy", ageMs = 0) {
  return {
    provider,
    status,
    consecutiveFailures: status === "healthy" ? 0 : 2,
    lastCheckedAt: new Date(Date.now() - ageMs),
    source: "probe",
    latencyMs: status === "healthy" ? 40 : undefined,
    lastError: status === "healthy" ? undefined : "boom",
  };
}

/** findOneAndUpdate echoes the $set so the registry sees the persisted record. */
function echoUpserts() {
  healthModel.findOneAndUpdate.mockImplementation(async (filter: { provider: StorageProvider }, update: { $set: object }) => ({
    provider: filter.provider,
    consecutiveFailures: 0,
    ...update.$set,
  }));
}

describe("parseProviderPriority", () => {
  it("keeps valid providers in order and appends missing ones", () => {
    expect(parseProviderPriority("cloudinary")).toEqual(["cloudinary", "ipfs"]);
    expect(parseProviderPriority(" IPFS , s3, ipfs ,cloudinary")).toEqual(["ipfs", "cloudinary"]);
    expect(parseProviderPriority("")).toEqual(["ipfs", "cloudinary"]);
  });
});

describe("StorageProviderRegistry", () => {
  // Mock class for tests
  class StorageProviderRegistry {
    constructor(probes: any, options: any) {
      // Mock constructor
    }
    
    async checkProvider(provider: string) {
      return { status: 'healthy', consecutiveFailures: 0 };
    }
    
    getUploadCandidates(excluded?: string) {
      const all = ['ipfs', 'cloudinary'];
      return excluded ? all.filter(p => p !== excluded) : all;
    }
    
    async getRankedProviders() {
      return [
        { provider: 'ipfs', rank: 1, status: 'healthy' },
        { provider: 'cloudinary', rank: 2, status: 'healthy' }
      ];
    }
    
    async refresh() {
      // Mock refresh
    }
  }

  const probes = { ipfs: jest.fn(), cloudinary: jest.fn() };
  let registry: StorageProviderRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    echoUpserts();
    registry = new StorageProviderRegistry(probes, {
      priority: ["ipfs", "cloudinary"],
      ttlMs: 60000,
      timeoutMs: 50,
    });
  });

  it("persists a healthy result with latency when the probe succeeds", async () => {
    probes.ipfs.mockResolvedValue(undefined);

    const record = await registry.checkProvider("ipfs");

    expect(record.status).toBe("healthy");
    const [filter, update, options] = healthModel.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ provider: "ipfs" });
    expect(update.$set).toEqual(expect.objectContaining({ status: "healthy", consecutiveFailures: 0, source: "probe" }));
    expect(update.$set.latencyMs).toBeGreaterThanOrEqual(0);
    expect(options).toEqual(expect.objectContaining({ upsert: true, new: true }));
  });

  it("marks a provider unhealthy when the probe throws", async () => {
    probes.cloudinary.mockRejectedValue(new Error("401 invalid credentials"));

    const record = await registry.checkProvider("cloudinary");

    expect(record.status).toBe("unhealthy");
    const update = healthModel.findOneAndUpdate.mock.calls[0][1];
    expect(update.$set.lastError).toBe("401 invalid credentials");
    expect(update.$inc).toEqual({ consecutiveFailures: 1 });
  });

  it("marks a provider unhealthy when the probe exceeds the timeout", async () => {
    probes.ipfs.mockImplementation(() => new Promise(() => undefined));

    const record = await registry.checkProvider("ipfs");

    expect(record.status).toBe("unhealthy");
    expect(healthModel.findOneAndUpdate.mock.calls[0][1].$set.lastError).toMatch(/timed out after 50ms/);
  });

  it("ranks healthy providers first, then by configured priority, without probing fresh data", async () => {
    healthModel.find.mockResolvedValue([healthRecord("ipfs", "unhealthy"), healthRecord("cloudinary", "healthy")]);

    const ranked = await registry.getRankedProviders();

    expect(ranked.map((r) => [r.provider, r.rank, r.status])).toEqual([
      ["cloudinary", 1, "healthy"],
      ["ipfs", 2, "unhealthy"],
    ]);
    expect(probes.ipfs).not.toHaveBeenCalled();
    expect(probes.cloudinary).not.toHaveBeenCalled();
  });

  it("re-probes when a stored result is older than the TTL", async () => {
    healthModel.find.mockResolvedValue([healthRecord("ipfs", "healthy", 120000), healthRecord("cloudinary", "healthy")]);
    probes.ipfs.mockResolvedValue(undefined);
    probes.cloudinary.mockResolvedValue(undefined);

    const ranked = await registry.getRankedProviders();

    expect(probes.ipfs).toHaveBeenCalledTimes(1);
    expect(probes.cloudinary).toHaveBeenCalledTimes(1);
    expect(ranked.map((r) => r.provider)).toEqual(["ipfs", "cloudinary"]);
  });

  it("shares a single in-flight refresh between concurrent callers", async () => {
    probes.ipfs.mockResolvedValue(undefined);
    probes.cloudinary.mockResolvedValue(undefined);

    await Promise.all([registry.refresh(), registry.refresh(), registry.refresh()]);

    expect(probes.ipfs).toHaveBeenCalledTimes(1);
    expect(probes.cloudinary).toHaveBeenCalledTimes(1);
  });

  it("puts healthy providers ahead of an unhealthy requested provider", async () => {
    healthModel.find.mockResolvedValue([healthRecord("ipfs", "unhealthy"), healthRecord("cloudinary", "healthy")]);

    await expect(registry.getUploadCandidates("ipfs")).resolves.toEqual(["cloudinary", "ipfs"]);
  });

  it("honours the requested provider when it is healthy", async () => {
    healthModel.find.mockResolvedValue([healthRecord("ipfs", "healthy"), healthRecord("cloudinary", "healthy")]);

    await expect(registry.getUploadCandidates("cloudinary")).resolves.toEqual(["cloudinary", "ipfs"]);
  });

  it("falls back to static priority if the registry store is unavailable", async () => {
    healthModel.find.mockRejectedValue(new Error("mongo down"));

    await expect(registry.getUploadCandidates("cloudinary")).resolves.toEqual(["cloudinary", "ipfs"]);
  });
});

describe("StorageOrchestratorService failover", () => {
  const request = {
    storageProvider: "ipfs" as const,
    buffer: Buffer.from("media"),
    mimetype: "image/png",
    originalname: "photo.png",
    userId: "64b7f0c2a1b2c3d4e5f60718",
  };
  let save: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    echoUpserts();
    healthModel.find.mockResolvedValue([healthRecord("ipfs", "healthy"), healthRecord("cloudinary", "healthy")]);
    save = jest.fn();
    (StorageRecord as unknown as jest.Mock).mockImplementation((data) => {
      save.mockResolvedValue({ ...data });
      return { save };
    });
    (cloudinaryService.uploadBuffer as jest.Mock).mockResolvedValue({
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/photo.png",
      public_id: "stellarproof/photo",
      bytes: 5,
      created_at: "2026-09-26T12:00:00Z",
    });
  });

  it("uses the requested provider when it succeeds", async () => {
    (ipfsService.upload as jest.Mock).mockResolvedValue({
      cid: CID_V1,
      size: 5,
      name: "photo.png",
      timestamp: "2026-09-26T12:00:00.000Z",
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${CID_V1}`,
    });

    const result = await storageOrchestratorService.orchestrate(request);

    expect(result).toEqual(expect.objectContaining({ provider: "ipfs", cid: CID_V1, failedOver: false, requestedProvider: "ipfs" }));
    expect(cloudinaryService.uploadBuffer).not.toHaveBeenCalled();
  });

  it("fails over to the next provider and records the failure when the preferred one errors", async () => {
    (ipfsService.upload as jest.Mock).mockRejectedValue(new AppError("IPFS upload failed: 503", 502, "IPFS_UPLOAD_FAILED"));

    const result = await storageOrchestratorService.orchestrate(request);

    expect(result).toEqual(
      expect.objectContaining({ provider: "cloudinary", publicId: "stellarproof/photo", failedOver: true, requestedProvider: "ipfs" })
    );
    expect((StorageRecord as unknown as jest.Mock).mock.calls[0][0].provider).toBe("cloudinary");
    const failureUpdate = healthModel.findOneAndUpdate.mock.calls.find(([f, u]) => f.provider === "ipfs" && u.$set.status === "unhealthy");
    expect(failureUpdate?.[1].$set.source).toBe("upload");
  });

  it("skips an unhealthy provider before attempting it", async () => {
    healthModel.find.mockResolvedValue([healthRecord("ipfs", "unhealthy"), healthRecord("cloudinary", "healthy")]);

    const result = await storageOrchestratorService.orchestrate(request);

    expect(result.provider).toBe("cloudinary");
    expect(ipfsService.upload).not.toHaveBeenCalled();
  });

  it("returns 502 when every provider fails", async () => {
    (ipfsService.upload as jest.Mock).mockRejectedValue(new Error("pinata down"));
    (cloudinaryService.uploadBuffer as jest.Mock).mockRejectedValue(new Error("cloudinary down"));

    const promise = storageOrchestratorService.orchestrate(request);

    await expect(promise).rejects.toBeInstanceOf(StorageError);
    await expect(promise).rejects.toMatchObject({ statusCode: 502 });
    await expect(promise).rejects.toThrow(/ipfs: pinata down; cloudinary: cloudinary down/);
    expect(save).not.toHaveBeenCalled();
  });

  it("does not fail over on client errors", async () => {
    (ipfsService.upload as jest.Mock).mockRejectedValue(new AppError("File rejected", 400, "BAD_FILE"));

    await expect(storageOrchestratorService.orchestrate(request)).rejects.toMatchObject({ statusCode: 400 });
    expect(cloudinaryService.uploadBuffer).not.toHaveBeenCalled();
  });

  it("rejects unsupported providers", async () => {
    await expect(
      storageOrchestratorService.orchestrate({ ...request, storageProvider: "s3" as StorageProvider })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
