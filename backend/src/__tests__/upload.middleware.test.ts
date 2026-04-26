import { uploadMiddleware } from "../middlewares/upload.middleware";

describe("Upload Middleware File Filter", () => {
  const mockCb = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow valid image mime types (image/jpeg)", () => {
    const mockFile = { mimetype: "image/jpeg" } as any;
    (uploadMiddleware as any).fileFilter({} as any, mockFile, mockCb);
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  it("should allow valid image mime types (image/png)", () => {
    const mockFile = { mimetype: "image/png" } as any;
    (uploadMiddleware as any).fileFilter({} as any, mockFile, mockCb);
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  it("should allow valid video mime types (video/mp4)", () => {
    const mockFile = { mimetype: "video/mp4" } as any;
    (uploadMiddleware as any).fileFilter({} as any, mockFile, mockCb);
    expect(mockCb).toHaveBeenCalledWith(null, true);
  });

  it("should reject invalid mime types (application/pdf)", () => {
    const mockFile = { mimetype: "application/pdf" } as any;
    (uploadMiddleware as any).fileFilter({} as any, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("Invalid file type: application/pdf"),
        code: "INVALID_FILE_TYPE",
      })
    );
  });

  it("should reject executable files (application/x-msdownload)", () => {
    const mockFile = { mimetype: "application/x-msdownload" } as any;
    (uploadMiddleware as any).fileFilter({} as any, mockFile, mockCb);
    
    expect(mockCb).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INVALID_FILE_TYPE",
      })
    );
  });
});
