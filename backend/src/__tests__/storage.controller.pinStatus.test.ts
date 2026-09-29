jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    PINATA_JWT: "test-jwt",
    PINATA_GATEWAY_URL: "https://gateway.pinata.cloud/ipfs",
  },
}));

jest.mock("../services/storage.service", () => ({
  __esModule: true,
  storageOrchestratorService: { orchestrate: jest.fn(), linkAsset: jest.fn() },
}));

jest.mock("../services/asset.service", () => ({
  __esModule: true,
  assetService: { createFromUpload: jest.fn() },
}));

import mongoose from "mongoose";
import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { uploadFile, uploadMedia } from "../controllers/storage.controller";
import { storageOrchestratorService } from "../services/storage.service";
import { assetService } from "../services/asset.service";

const CID_V1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
const GATEWAY_URL = `https://gateway.pinata.cloud/ipfs/${CID_V1}`;

/** UploadResult as produced by the orchestrator for a still-propagating pin. */
const ipfsUploadResult = {
  provider: "ipfs" as const,
  url: GATEWAY_URL,
  gatewayUrl: GATEWAY_URL,
  cid: CID_V1,
  size: 5,
  mimetype: "video/mp4",
  uploadedAt: new Date(),
  pinningStatus: "pinning" as const,
  availability: { available: false, httpStatus: 404, checkedAt: "2026-09-28T00:00:00.000Z" },
};

describe("storage.controller IPFS pin-status reporting", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it("returns pinningStatus, gatewayUrl and availability from uploadMedia", async () => {
    (storageOrchestratorService.orchestrate as jest.Mock).mockResolvedValue(ipfsUploadResult);
    (assetService.createFromUpload as jest.Mock).mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      storageProvider: "ipfs",
      storageReferenceId: CID_V1,
    });

    const req = {
      file: {
        buffer: Buffer.from("media"),
        originalname: "clip.mp4",
        mimetype: "video/mp4",
        size: 5,
      } as Express.Multer.File,
      body: { storageProvider: "ipfs" },
      user: { id: userId } as unknown as Request["user"],
    } as unknown as Request;

    await uploadMedia(req, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          gatewayUrl: GATEWAY_URL,
          pinningStatus: "pinning",
          availability: { available: false, httpStatus: 404, checkedAt: "2026-09-28T00:00:00.000Z" },
          mediaCid: CID_V1,
          cidVersion: 1,
        }),
      })
    );
  });

  it("returns the persisted pin fields from uploadFile", async () => {
    (storageOrchestratorService.orchestrate as jest.Mock).mockResolvedValue({
      ...ipfsUploadResult,
      recordId: "record-1",
    });

    const req = {
      file: {
        buffer: Buffer.from("media"),
        originalname: "clip.mp4",
        mimetype: "video/mp4",
        size: 5,
      } as Express.Multer.File,
      body: { storageProvider: "ipfs", userId },
    } as unknown as Request;

    await uploadFile(req, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        data: expect.objectContaining({
          provider: "ipfs",
          gatewayUrl: GATEWAY_URL,
          pinningStatus: "pinning",
          availability: expect.objectContaining({ available: false, httpStatus: 404 }),
        }),
      })
    );
  });
});
