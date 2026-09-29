jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    NODE_ENV: "test",
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

jest.mock("../services/storage.service", () => ({
  __esModule: true,
  storageOrchestratorService: { orchestrate: jest.fn() },
}));

jest.mock("../models/Asset.model", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

jest.mock("../models/StorageRecord.model", () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

import express from "express";
import request from "supertest";
import mongoose from "mongoose";
import storageRoutes from "../routes/v1/storage.routes";
import { globalErrorHandler } from "../middlewares/errorHandler";
import { storageOrchestratorService } from "../services/storage.service";
import Asset from "../models/Asset.model";
import StorageRecord from "../models/StorageRecord.model";
import { computeSha256 } from "../utils/crypto";

const orchestrate = storageOrchestratorService.orchestrate as jest.Mock;
const assetCreate = Asset.create as jest.Mock;
const storageFind = StorageRecord.find as jest.Mock;

const app = express();
app.use(express.json());
app.use("/api/v1/storage", storageRoutes);
app.use(globalErrorHandler);

const fileBytes = Buffer.from("stellarproof media payload");
const correctHash = computeSha256(fileBytes);
const wrongHash = computeSha256(Buffer.from("tampered payload"));
const userId = new mongoose.Types.ObjectId().toString();

/** Mongoose query chain: find().sort().select().lean().exec() */
const mockFindResult = (docs: unknown[]) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(docs),
  };
  storageFind.mockReturnValue(chain);
  return chain;
};

describe("Storage hash consistency (/api/v1/storage)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /verify-hash", () => {
    it("returns 200 with existing records for a matching hash", async () => {
      const recordId = new mongoose.Types.ObjectId();
      const uploadedAt = new Date("2026-09-20T12:00:00.000Z");
      mockFindResult([
        {
          _id: recordId,
          provider: "ipfs",
          url: "https://gateway.pinata.cloud/ipfs/bafy123",
          cid: "bafy123",
          uploadedAt,
        },
      ]);

      const res = await request(app)
        .post("/api/v1/storage/verify-hash")
        .field("contentHash", `sha256:${correctHash.toUpperCase()}`)
        .field("userId", userId)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: "contentHash matches the uploaded file",
        data: {
          contentHash: correctHash,
          size: fileBytes.length,
          matches: true,
          alreadyStored: true,
          existingRecords: [
            {
              id: recordId.toString(),
              provider: "ipfs",
              url: "https://gateway.pinata.cloud/ipfs/bafy123",
              cid: "bafy123",
              uploadedAt: uploadedAt.toISOString(),
            },
          ],
        },
      });

      const filter = storageFind.mock.calls[0][0];
      expect(filter.contentHash).toBe(correctHash);
      expect(filter.userId.toString()).toBe(userId);
    });

    it("returns 422 on mismatch without querying or writing anything", async () => {
      const res = await request(app)
        .post("/api/v1/storage/verify-hash")
        .field("contentHash", wrongHash)
        .field("userId", userId)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(422);
      expect(res.body).toMatchObject({ success: false, code: "CONTENT_HASH_MISMATCH" });
      expect(res.body.error).toContain(correctHash);
      expect(storageFind).not.toHaveBeenCalled();
    });

    it("returns 400 when contentHash is missing", async () => {
      const res = await request(app)
        .post("/api/v1/storage/verify-hash")
        .field("userId", userId)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("CONTENT_HASH_REQUIRED");
    });

    it("returns 400 when contentHash is malformed", async () => {
      const res = await request(app)
        .post("/api/v1/storage/verify-hash")
        .field("contentHash", "not-a-hash")
        .field("userId", userId)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("INVALID_CONTENT_HASH");
    });

    it("returns 400 when no file is attached", async () => {
      const res = await request(app)
        .post("/api/v1/storage/verify-hash")
        .field("contentHash", correctHash)
        .field("userId", userId);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("NO_FILE_PROVIDED");
    });

    it("returns 401 when no user can be resolved", async () => {
      const res = await request(app)
        .post("/api/v1/storage/verify-hash")
        .field("contentHash", correctHash)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("AUTH_REQUIRED");
    });
  });

  describe("POST /upload", () => {
    it("returns 422 and never reaches the orchestrator on mismatch", async () => {
      const res = await request(app)
        .post("/api/v1/storage/upload")
        .field("storageProvider", "ipfs")
        .field("userId", userId)
        .field("contentHash", wrongHash)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(422);
      expect(res.body.code).toBe("CONTENT_HASH_MISMATCH");
      expect(orchestrate).not.toHaveBeenCalled();
    });

    it("passes the verified server-side hash to the orchestrator", async () => {
      orchestrate.mockResolvedValue({
        provider: "ipfs",
        url: "https://gateway.pinata.cloud/ipfs/bafy123",
        cid: "bafy123",
        size: fileBytes.length,
        mimetype: "image/png",
        contentHash: correctHash,
        uploadedAt: new Date(),
      });

      const res = await request(app)
        .post("/api/v1/storage/upload")
        .field("storageProvider", "ipfs")
        .field("userId", userId)
        .field("contentHash", `0x${correctHash}`)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(201);
      expect(res.body.data.contentHash).toBe(correctHash);
      expect(orchestrate).toHaveBeenCalledWith(
        expect.objectContaining({ contentHash: correctHash }),
      );
    });

    it("still hashes the upload server-side when no contentHash is supplied", async () => {
      orchestrate.mockResolvedValue({ provider: "ipfs", url: "u", size: 1, mimetype: "m", uploadedAt: new Date() });

      const res = await request(app)
        .post("/api/v1/storage/upload")
        .field("storageProvider", "ipfs")
        .field("userId", userId)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(201);
      expect(orchestrate).toHaveBeenCalledWith(
        expect.objectContaining({ contentHash: correctHash }),
      );
    });
  });

  describe("POST /media", () => {
    it("returns 422 and creates no Asset on mismatch", async () => {
      const res = await request(app)
        .post("/api/v1/storage/media")
        .field("userId", userId)
        .field("contentHash", wrongHash)
        .attach("file", fileBytes, "photo.png");

      expect(res.status).toBe(422);
      expect(orchestrate).not.toHaveBeenCalled();
      expect(assetCreate).not.toHaveBeenCalled();
    });
  });
});
