import { cloudinary } from "../config/cloudinary";
import { Readable } from "stream";
import { CloudinaryUploadResult } from "../types/cloudinary.types";
import { AppError } from "../errors/AppError";
import { StatusCodes } from "http-status-codes";

class CloudinaryService {
  /**
   * Upload a file buffer to Cloudinary using upload_stream.
   * @param buffer The file buffer to upload.
   * @param fileName Original file name for reference.
   * @returns The Cloudinary upload result.
   */
  async uploadBuffer(buffer: Buffer, fileName: string): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "stellarproof/media",
          public_id: `${Date.now()}-${fileName.split(".")[0]}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                `Cloudinary upload failed: ${error.message}`,
                StatusCodes.INTERNAL_SERVER_ERROR,
                "CLOUDINARY_UPLOAD_ERROR"
              )
            );
          }
          if (!result) {
            return reject(
              new AppError(
                "Cloudinary upload failed: No result returned",
                StatusCodes.INTERNAL_SERVER_ERROR,
                "CLOUDINARY_UPLOAD_ERROR"
              )
            );
          }
          resolve(result as CloudinaryUploadResult);
        }
      );

      // Create a readable stream from the buffer and pipe it to the upload stream
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }
}

export const cloudinaryService = new CloudinaryService();
