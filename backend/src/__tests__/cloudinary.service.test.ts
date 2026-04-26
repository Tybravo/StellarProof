jest.mock("../config/env", () => ({
  __esModule: true,
  env: {
    MONGODB_URI: "mongodb://localhost:27017/test",
    JWT_SECRET: "test-secret",
    CLOUDINARY_CLOUD_NAME: "test_cloud",
    CLOUDINARY_API_KEY: "test_key",
    CLOUDINARY_API_SECRET: "test_secret",
    PINATA_JWT: "test_pinata",
  },
}));

jest.mock("../config/cloudinary", () => ({
  __esModule: true,
  cloudinary: {
    uploader: {
      upload_stream: jest.fn(),
    },
  },
}));

import { cloudinaryService } from "../services/cloudinary.service";
import { cloudinary } from "../config/cloudinary";

describe("CloudinaryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadBuffer", () => {
    it("should successfully upload a buffer to cloudinary", async () => {
      const mockResponse = {
        secure_url: "https://cloudinary.com/test.jpg",
        public_id: "test_id",
      };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(null, mockResponse);
        return { pipe: jest.fn() };
      });

      const result = await cloudinaryService.uploadBuffer(Buffer.from("test"), "test.jpg");

      expect(result).toEqual(mockResponse);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({ public_id: expect.stringContaining("test") }),
        expect.any(Function)
      );
    });

    it("should throw an error if cloudinary upload fails", async () => {
      const mockError = new Error("Upload failed");

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
        callback(mockError, null);
        return { pipe: jest.fn() };
      });

      await expect(cloudinaryService.uploadBuffer(Buffer.from("test"), "test.jpg")).rejects.toThrow(
        "Upload failed"
      );
    });
  });
});
