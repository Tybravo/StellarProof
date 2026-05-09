jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    CLOUDINARY_CLOUD_NAME: "test",
    CLOUDINARY_API_KEY: "test",
    CLOUDINARY_API_SECRET: "test",
    PINATA_JWT: "test",
  },
}));

jest.mock("../services/cloudinary.service", () => ({
  __esModule: true,
  cloudinaryService: {
    uploadBuffer: jest.fn(),
  },
}));

jest.mock("../services/asset.service", () => ({
  __esModule: true,
  assetService: {
    createAsset: jest.fn(),
    getAssetById: jest.fn(),
  },
}));

import { mediaController } from "../controllers/media.controller";
import { cloudinaryService } from "../services/cloudinary.service";
import { assetService } from "../services/asset.service";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

describe("MediaController", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      file: {
        buffer: Buffer.from("test content"),
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        size: 1024,
      } as any,
      user: { id: "user-123" } as any,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("successfully uploads media, saves to DB, and returns retrieved data", async () => {
    const mockCloudinaryResult = {
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
      public_id: "test_id",
    };

    const mockSavedAsset = {
      _id: "asset-999",
      fileName: "test-image.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      storageReferenceId: "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
      createdAt: new Date(),
    };

    (cloudinaryService.uploadBuffer as jest.Mock).mockResolvedValue(mockCloudinaryResult);
    (assetService.createAsset as jest.Mock).mockResolvedValue({ _id: "asset-999" });
    (assetService.getAssetById as jest.Mock).mockResolvedValue(mockSavedAsset);

    await mediaController.uploadMedia(req as Request, res as Response, next);

    expect(cloudinaryService.uploadBuffer).toHaveBeenCalledWith(req.file?.buffer);
    expect(assetService.createAsset).toHaveBeenCalledWith(expect.objectContaining({
      creatorId: "user-123",
      fileName: "test-image.jpg",
      storageProvider: "cloudinary",
      storageReferenceId: mockCloudinaryResult.secure_url,
    }));
    expect(assetService.getAssetById).toHaveBeenCalledWith("asset-999");
    
    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Media uploaded and saved successfully",
      data: expect.objectContaining({
        assetId: "asset-999",
        url: mockCloudinaryResult.secure_url,
      }),
    });
  });

  it("throws error if no file is provided", async () => {
    req.file = undefined;

    await mediaController.uploadMedia(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: StatusCodes.BAD_REQUEST,
      code: "NO_FILE_PROVIDED",
    }));
  });

  it("handles service errors gracefully", async () => {
    const error = new Error("Upload failed");
    (cloudinaryService.uploadBuffer as jest.Mock).mockRejectedValue(error);

    await mediaController.uploadMedia(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
