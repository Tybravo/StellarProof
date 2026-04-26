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
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    res = {
      status: statusMock,
    };
    req = {
      user: { id: "user-id" } as any,
    };
    jest.clearAllMocks();
  });

  describe("uploadMedia", () => {
    it("should upload media and save to database successfully", async () => {
      req.file = {
        buffer: Buffer.from("test"),
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        size: 100,
      } as any;

      const mockCloudinaryResult = {
        secure_url: "https://cloudinary.com/test.jpg",
        public_id: "test_id",
      };

      const mockAsset = {
        _id: "asset-id",
        creatorId: "user-id",
        fileName: "test.jpg",
        storageProvider: "cloudinary",
        storageReferenceId: "test_id",
      };

      (cloudinaryService.uploadBuffer as jest.Mock).mockResolvedValue(mockCloudinaryResult);
      (assetService.createAsset as jest.Mock).mockResolvedValue(mockAsset);
      (assetService.getAssetById as jest.Mock).mockResolvedValue(mockAsset);

      await mediaController.uploadMedia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            assetId: "asset-id",
            url: "https://cloudinary.com/test.jpg",
          }),
        })
      );
    });

    it("should return 400 if no file is provided", async () => {
      await mediaController.uploadMedia(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "No file uploaded",
        })
      );
    });
  });
});
