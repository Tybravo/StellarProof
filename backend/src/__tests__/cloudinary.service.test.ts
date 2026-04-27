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

  it("successfully uploads a buffer", async () => {
    const mockResult = {
      secure_url: "https://res.cloudinary.com/test/image/upload/v1/test.jpg",
      public_id: "stellarproof/test_id",
      format: "jpg",
      resource_type: "image",
      bytes: 1024,
      folder: "stellarproof",
      created_at: "2026-04-26T14:14:13Z",
    };

    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
      // Simulate asynchronous callback
      setTimeout(() => callback(null, mockResult), 0);
      return { 
        end: jest.fn().mockImplementation((buffer) => {
          // Do nothing
        }) 
      };
    });

    const result = await cloudinaryService.uploadBuffer(Buffer.from("test content"));
    
    expect(result.secure_url).toBe(mockResult.secure_url);
    expect(result.public_id).toBe(mockResult.public_id);
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "stellarproof" }),
      expect.any(Function)
    );
  });

  it("throws an error when Cloudinary returns an error", async () => {
    const mockError = { message: "Invalid API Key" };

    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
      setTimeout(() => callback(mockError, null), 0);
      return { end: jest.fn() };
    });

    await expect(cloudinaryService.uploadBuffer(Buffer.from("test")))
      .rejects.toThrow("Cloudinary upload failed: Invalid API Key");
  });

  it("throws an error when Cloudinary returns no result and no error", async () => {
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation((options, callback) => {
      setTimeout(() => callback(null, null), 0);
      return { end: jest.fn() };
    });

    await expect(cloudinaryService.uploadBuffer(Buffer.from("test")))
      .rejects.toThrow("Cloudinary upload failed: No result returned");
  });
});
