import multer from "multer";
import { Request } from "express";
import { AppError } from "../errors/AppError";
import { StatusCodes } from "http-status-codes";

// Define allowed mime types for images and videos
const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Videos
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Filter files based on mime-type.
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type: ${file.mimetype}. Only images and videos are allowed.`,
        StatusCodes.BAD_REQUEST,
        "INVALID_FILE_TYPE"
      )
    );
  }
};

/**
 * Multer middleware configuration.
 * Uses memory storage for fast Web2 retrieval and Cloudinary streaming.
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});
