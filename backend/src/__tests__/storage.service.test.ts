jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    PINATA_JWT: "test_pinata",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
    IPFS_UPLOAD_TIMEOUT_MS: 50,
  },
}));

jest.mock("../utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock("../services/ipfs.service", () => ({
  __esModule: true,
  ipfsService: { upload: jest.fn() },
}));

jest.mock("../services/cloudinary.service", () => ({
  __esModule: true,
  cloudinaryService: { uploadBuffer: jest.fn() },
}));

// StorageRecord is replaced with a constructor whose save() echoes the document,
// mirroring what Mongoose returns after a successful insert.
const mockSave = jest.fn();
jest.mock("../models/StorageRecord.model", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((doc: Record<string, unknown>) => ({
    save: () => mockSave(doc),
  })),
}));

import { storageOrchestratorService } from "../services/storage.service";
import { ipfsService } from "../services/ipfs.service";
import { cloudinaryService } from "../services/cloudinary.service";
import StorageRecord from "../models/StorageRecord.model";
import { AppError } from "../errors/AppError";
import { StorageError, type UploadRequest } from "../types/storage.types";
import logger from "../utils/logger";

const ipfsUpload = ipfsService.upload as jest.Mock;
const cloudinaryUpload = cloudinaryService.uploadBuffer as jest.Mock;
const StorageRecordMock = StorageRecord as unknown as jest.Mock;

const buildRequest = (overrides: Partial<UploadRequest> = {}): UploadRequest => ({
  storageProvider: "ipfs",
  buffer: Buffer.from("media-bytes"),
  mimetype: "image/png",
  originalname: "photo.png",
  userId: "60d0fe4f53112b6158880001",
  ...overrides,
});

const ipfsSuccess = {
  cid: "bafkreigh2akiscaildc",
  size: 11,
  name: "photo.png",
  timestamp: "2026-09-26T10:00:00.000Z",
  gatewayUrl: "https://gateway.pinata.cloud/ipfs/bafkreigh2akiscaildc",
};

const cloudinarySuccess = {
  secure_url: "https://res.cloudinary.com/demo/image/upload/v1/stellarproof/photo.png",
  public_id: "stellarproof/photo",
  format: "png",
  resource_type: "image",
  bytes: 11,
  folder: "stellarproof",
  created_at: "2026-09-26T10:00:01Z",
};

const persistedDoc = () => StorageRecordMock.mock.calls[0][0] as Record<string, unknown>;

describe("StorageOrchestratorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockImplementation(async (doc: Record<string, unknown>) => ({ ...doc }));
  });

  describe("IPFS happy path", () => {
    it("stores on IPFS and records no fallback", async () => {
      ipfsUpload.mockResolvedValue(ipfsSuccess);

      const result = await storageOrchestratorService.orchestrate(buildRequest());

      expect(cloudinaryUpload).not.toHaveBeenCalled();
      expect(persistedDoc()).toMatchObject({
        provider: "ipfs",
        requestedProvider: "ipfs",
        fallbackUsed: false,
        fallbackReason: undefined,
        cid: ipfsSuccess.cid,
      });
      expect(result).toMatchObject({
        provider: "ipfs",
        requestedProvider: "ipfs",
        fallbackUsed: false,
        url: ipfsSuccess.gatewayUrl,
        cid: ipfsSuccess.cid,
        size: ipfsSuccess.size,
        mimetype: "image/png",
        uploadedAt: new Date(ipfsSuccess.timestamp),
      });
      expect(result.publicId).toBeUndefined();
    });
  });

  describe("Cloudinary fallback", () => {
    it("routes the same buffer to Cloudinary when IPFS pinning fails", async () => {
      const request = buildRequest();
      ipfsUpload.mockRejectedValue(
        new AppError("IPFS upload failed: Pinata 500", 502, "IPFS_UPLOAD_FAILED"),
      );
      cloudinaryUpload.mockResolvedValue(cloudinarySuccess);

      const result = await storageOrchestratorService.orchestrate(request);

      expect(cloudinaryUpload).toHaveBeenCalledTimes(1);
      expect(cloudinaryUpload.mock.calls[0][0]).toBe(request.buffer);
      expect(persistedDoc()).toMatchObject({
        provider: "cloudinary",
        requestedProvider: "ipfs",
        fallbackUsed: true,
        fallbackReason: "IPFS upload failed: Pinata 500",
        publicId: cloudinarySuccess.public_id,
        originalFilename: "photo.png",
      });
      expect(result).toMatchObject({
        provider: "cloudinary",
        requestedProvider: "ipfs",
        fallbackUsed: true,
        url: cloudinarySuccess.secure_url,
        publicId: cloudinarySuccess.public_id,
        size: cloudinarySuccess.bytes,
      });
      expect(result.cid).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        "IPFS upload failed; falling back to Cloudinary",
        expect.objectContaining({ reason: "IPFS upload failed: Pinata 500" }),
      );
    });

    it("falls back when IPFS pinning exceeds IPFS_UPLOAD_TIMEOUT_MS", async () => {
      jest.useFakeTimers();
      try {
        ipfsUpload.mockReturnValue(new Promise(() => undefined)); // never settles
        cloudinaryUpload.mockResolvedValue(cloudinarySuccess);

        const pending = storageOrchestratorService.orchestrate(buildRequest());
        await jest.advanceTimersByTimeAsync(50);
        const result = await pending;

        expect(result.provider).toBe("cloudinary");
        expect(result.fallbackUsed).toBe(true);
        expect(persistedDoc().fallbackReason).toBe("IPFS pinning timed out after 50ms");
      } finally {
        jest.useRealTimers();
      }
    });

    it("logs the CID of a pin that completes after the timeout", async () => {
      jest.useFakeTimers();
      try {
        let resolveLate: (value: typeof ipfsSuccess) => void = () => undefined;
        ipfsUpload.mockReturnValue(new Promise((resolve) => { resolveLate = resolve; }));
        cloudinaryUpload.mockResolvedValue(cloudinarySuccess);

        const pending = storageOrchestratorService.orchestrate(buildRequest());
        await jest.advanceTimersByTimeAsync(50);
        await pending;

        resolveLate(ipfsSuccess);
        await Promise.resolve();

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining("IPFS pin completed after timeout"),
          expect.objectContaining({ cid: ipfsSuccess.cid }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it("truncates oversized fallback reasons to the schema limit", async () => {
      ipfsUpload.mockRejectedValue(new Error("x".repeat(5000)));
      cloudinaryUpload.mockResolvedValue(cloudinarySuccess);

      await storageOrchestratorService.orchestrate(buildRequest());

      expect((persistedDoc().fallbackReason as string).length).toBe(1000);
    });

    it("throws a structured 503 StorageError when both providers fail", async () => {
      ipfsUpload.mockRejectedValue(new Error("pinata unreachable"));
      cloudinaryUpload.mockRejectedValue(new Error("cloudinary quota exceeded"));

      const error = await storageOrchestratorService
        .orchestrate(buildRequest())
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(StorageError);
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({
        statusCode: 503,
        code: "STORAGE_UPLOAD_FAILED",
        provider: "ipfs",
      });
      expect((error as StorageError).message).toContain("pinata unreachable");
      expect((error as StorageError).message).toContain("cloudinary quota exceeded");
      expect(StorageRecordMock).not.toHaveBeenCalled();
    });
  });

  describe("Cloudinary requests", () => {
    it("never falls back to IPFS when Cloudinary was requested", async () => {
      cloudinaryUpload.mockRejectedValue(new Error("cloudinary down"));

      await expect(
        storageOrchestratorService.orchestrate(buildRequest({ storageProvider: "cloudinary" })),
      ).rejects.toMatchObject({ statusCode: 502, provider: "cloudinary" });
      expect(ipfsUpload).not.toHaveBeenCalled();
    });

    it("stores directly on Cloudinary with no fallback flags", async () => {
      cloudinaryUpload.mockResolvedValue(cloudinarySuccess);

      const result = await storageOrchestratorService.orchestrate(
        buildRequest({ storageProvider: "cloudinary" }),
      );

      expect(result).toMatchObject({
        provider: "cloudinary",
        requestedProvider: "cloudinary",
        fallbackUsed: false,
      });
      expect(persistedDoc().fallbackReason).toBeUndefined();
    });
  });

  describe("validation and persistence", () => {
    it("rejects unknown providers with a 400 before touching any provider", async () => {
      await expect(
        storageOrchestratorService.orchestrate(
          buildRequest({ storageProvider: "s3" as unknown as UploadRequest["storageProvider"] }),
        ),
      ).rejects.toMatchObject({ statusCode: 400, code: "STORAGE_ORCHESTRATE_FAILED" });
      expect(ipfsUpload).not.toHaveBeenCalled();
      expect(cloudinaryUpload).not.toHaveBeenCalled();
    });

    it("attributes persistence failures to the provider that stored the file", async () => {
      ipfsUpload.mockRejectedValue(new Error("pinata 429"));
      cloudinaryUpload.mockResolvedValue(cloudinarySuccess);
      mockSave.mockRejectedValue(new Error("E11000 duplicate key"));

      await expect(storageOrchestratorService.orchestrate(buildRequest())).rejects.toMatchObject({
        statusCode: 500,
        provider: "cloudinary",
        operation: "persist",
      });
    });
  });
});
