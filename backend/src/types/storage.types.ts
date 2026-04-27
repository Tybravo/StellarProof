/**
 * Shared interfaces and types for storage orchestration
 * All storage-related types are defined here for consistency
 */

export type StorageProvider = 'cloudinary' | 'ipfs';

export interface UploadRequest {
  storageProvider: StorageProvider;
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  userId: string;
}

export interface UploadResult {
  provider: StorageProvider;
  url: string;
  cid?: string;          // IPFS only
  publicId?: string;     // Cloudinary only
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

/**
 * Base interface for storage provider implementations
 */
export interface IStorageProvider {
  upload(buffer: Buffer, mimetype: string, originalname: string): Promise<UploadResult>;
}

/**
 * Storage errors have provider context
 */
export class StorageError extends Error {
  statusCode: number;
  status: 'fail' | 'error';

  constructor(
    public provider: StorageProvider | null,
    public operation: string,
    public reason: string,
    statusCode: number = 500,
  ) {
    super(`Storage Error [${provider}/${operation}]: ${reason}`);
    this.name = 'StorageError';
    this.statusCode = statusCode;
    this.status = statusCode < 500 ? 'fail' : 'error';
  }
}
