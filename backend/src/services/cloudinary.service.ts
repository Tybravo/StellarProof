import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { IStorageProvider, StorageError, UploadResult } from '../types/storage.types';

/**
 * Cloudinary Storage Provider
 * Handles file uploads to Cloudinary using their Node.js SDK
 */
class CloudinaryService implements IStorageProvider {
  constructor() {
    this.initializeCloudinary();
  }

  private initializeCloudinary(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new StorageError(
        'cloudinary',
        'initialization',
        'Missing required Cloudinary environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
        500,
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  async upload(buffer: Buffer, mimetype: string, originalname: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'stellarproof',
          public_id: this.generatePublicId(originalname),
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            reject(
              new StorageError(
                'cloudinary',
                'upload',
                `Upload failed: ${error.message}`,
                502,
              ),
            );
            return;
          }

          if (!result) {
            reject(
              new StorageError(
                'cloudinary',
                'upload',
                'No result returned from Cloudinary',
                502,
              ),
            );
            return;
          }

          resolve({
            provider: 'cloudinary',
            url: result.secure_url || result.url,
            publicId: result.public_id,
            size: result.bytes,
            mimetype,
            uploadedAt: new Date(),
          });
        },
      );

      // Write buffer to stream
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /**
   * Generate a unique public ID from the filename
   * Removes special characters and uses timestamp for uniqueness
   */
  private generatePublicId(originalname: string): string {
    const timestamp = Date.now();
    const sanitized = originalname.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
    return `${sanitized}-${timestamp}`;
  }
import { cloudinary } from "../config/cloudinary";
import { AppError } from "../errors/AppError";
import { StatusCodes } from "http-status-codes";
import type { CloudinaryUploadResult } from "../types/cloudinary.types";
import { UploadApiResponse } from "cloudinary";

class CloudinaryService {
  /**
   * Uploads a file buffer to Cloudinary using upload stream.
   * 
   * @param buffer - File buffer to upload
   * @param folder - Cloudinary folder name
   * @returns Promise<CloudinaryUploadResult>
   */
  async uploadBuffer(
    buffer: Buffer,
    folder: string = "stellarproof"
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder, resource_type: "auto" },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                `Cloudinary upload failed: ${error.message}`,
                StatusCodes.INTERNAL_SERVER_ERROR,
                "CLOUDINARY_UPLOAD_FAILED"
              )
            );
          }

          if (!result) {
            return reject(
              new AppError(
                "Cloudinary upload failed: No result returned",
                StatusCodes.INTERNAL_SERVER_ERROR,
                "CLOUDINARY_UPLOAD_FAILED"
              )
            );
          }

          const uploadResult = result as UploadApiResponse;

          resolve({
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            format: uploadResult.format,
            resource_type: uploadResult.resource_type,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
            folder: uploadResult.folder,
            created_at: uploadResult.created_at,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}

export const cloudinaryService = new CloudinaryService();
