jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    PINATA_JWT: "test_pinata",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
  },
}));

jest.mock("../services/ipfs.service", () => ({
  __esModule: true,
  ipfsService: { upload: jest.fn() },
}));

jest.mock("../services/cloudinary.service", () => ({
  __esModule: true,
  cloudinaryService: { uploadBuffer: jest.fn() },
}));

const mockSave = jest.fn();
jest.mock("../models/StorageRecord.model", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((doc: Record<string, unknown>) => ({
    save: () => mockSave(doc),
  })),
}));

import { storageOrchestratorService } from "../services/storage.service";
import { ipfsService } from "../services/ipfs.service";
import StorageRecord from "../models/StorageRecord.model";
import { computeSha256 } from "../utils/crypto";

const buffer = Buffer.from("persisted bytes");

describe("StorageOrchestratorService content hash persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockImplementation(async (doc: Record<string, unknown>) => ({ ...doc }));
    (ipfsService.upload as jest.Mock).mockResolvedValue({
      cid: "bafy123",
      size: buffer.length,
      name: "file.bin",
      timestamp: "2026-09-26T10:00:00.000Z",
      gatewayUrl: "https://gateway.pinata.cloud/ipfs/bafy123",
    });
  });

  const baseRequest = {
    storageProvider: "ipfs" as const,
    buffer,
    mimetype: "application/octet-stream",
    originalname: "file.bin",
    userId: "60d0fe4f53112b6158880001",
  };

  it("persists and returns the verified hash supplied by the controller", async () => {
    const contentHash = computeSha256(buffer);

    const result = await storageOrchestratorService.orchestrate({ ...baseRequest, contentHash });

    const persisted = (StorageRecord as unknown as jest.Mock).mock.calls[0][0];
    expect(persisted.contentHash).toBe(contentHash);
    expect(result.contentHash).toBe(contentHash);
  });

  it("computes the hash itself when the caller did not supply one", async () => {
    const result = await storageOrchestratorService.orchestrate(baseRequest);

    expect(result.contentHash).toBe(computeSha256(buffer));
  });
});
