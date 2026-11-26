/**
 * Cloudinary Fallback Service
 * 
 * Provides an automatic fallback upload mechanism to Cloudinary when IPFS pinning
 * is delayed or encounters errors.
 * 
 * @module services/cloudinaryFallback
 */

import { uploadFileToIPFS, type IpfsUploadResponse } from './ipfsService';

export type StorageProviderType = 'ipfs' | 'cloudinary';

export type UploadStateStatus =
  | 'idle'
  | 'uploading_ipfs'
  | 'ipfs_delayed'
  | 'uploading_cloudinary'
  | 'success'
  | 'error';

export interface UploadProgressState {
  status: UploadStateStatus;
  provider?: StorageProviderType | null;
  progress?: number;
  error?: string | null;
  message?: string;
}

export interface CloudinaryConfig {
  cloudName?: string;
  uploadPreset?: string;
  apiKey?: string;
  apiSecret?: string;
  folder?: string;
  apiBaseUrl?: string;
}

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  provider: 'cloudinary';
  error?: string;
  fallbackUsed: boolean;
}

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  cid?: string;
  publicId?: string;
  provider: StorageProviderType;
  format?: string;
  bytes?: number;
  error?: string;
  fallbackUsed: boolean;
}

export interface MediaUploadOptions {
  /** Maximum time (in ms) to wait for IPFS pinning before falling back to Cloudinary. Default: 10000ms. */
  ipfsTimeoutMs?: number;
  /** Cloudinary folder destination. Default: 'stellarproof/media'. */
  folder?: string;
  /** Cloudinary unsigned upload preset. Default from NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET or 'stellarproof_media'. */
  uploadPreset?: string;
  /** Cloudinary cloud name. Default from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or 'stellarproof'. */
  cloudName?: string;
  /** Cloudinary API key if available. Default from NEXT_PUBLIC_CLOUDINARY_API_KEY. */
  apiKey?: string;
  /** Tags for the uploaded asset. */
  tags?: string[];
  /** State change listener for loading and progress reporting. */
  onStateChange?: (state: UploadProgressState) => void;
  /** Custom uploader for IPFS to ease testing and mocking. */
  customIpfsUploader?: (file: File) => Promise<IpfsUploadResponse>;
  /** Whether to attempt backend /api/v1/storage/upload if direct Cloudinary REST fails. Default: true. */
  backendFallback?: boolean;
}

const DEFAULT_IPFS_TIMEOUT_MS = 10000;
const DEFAULT_FOLDER = 'stellarproof/media';
const DEFAULT_UPLOAD_PRESET = 'stellarproof_media';
const DEFAULT_CLOUD_NAME = 'stellarproof';

/**
 * Checks whether Cloudinary configuration is available.
 */
export function isCloudinaryConfigured(customCloudName?: string): boolean {
  const cloudName =
    customCloudName ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      : undefined) ||
    DEFAULT_CLOUD_NAME;
  return Boolean(cloudName);
}

/**
 * Constructs an IPFS gateway URL from a CID.
 */
export function getIpfsGatewayUrl(cid: string): string {
  const gateway =
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_IPFS_GATEWAY
      : undefined) || 'https://ipfs.io/ipfs/';
  const base = gateway.endsWith('/') ? gateway : `${gateway}/`;
  return `${base}${cid}`;
}

/**
 * Constructs a Cloudinary delivery URL for a given public ID.
 */
export function getCloudinaryUrl(
  publicId: string,
  options?: { cloudName?: string; width?: number; height?: number; crop?: string }
): string {
  const cloudName =
    options?.cloudName ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      : undefined) ||
    DEFAULT_CLOUD_NAME;

  const transformations: string[] = [];
  if (options?.crop) transformations.push(`c_${options.crop}`);
  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);

  const transformPath = transformations.length > 0 ? `${transformations.join(',')}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformPath}${publicId}`;
}

/**
 * Directly uploads a media file or blob to Cloudinary.
 * First tries direct Cloudinary API upload; if unsuccessful or unconfigured,
 * attempts fallback via the backend storage API (/api/v1/storage/upload).
 * 
 * @param file - The File or Blob to upload
 * @param options - Upload options and credentials
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options?: MediaUploadOptions
): Promise<CloudinaryUploadResult> {
  const cloudName =
    options?.cloudName ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      : undefined) ||
    DEFAULT_CLOUD_NAME;

  const uploadPreset =
    options?.uploadPreset ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      : undefined) ||
    DEFAULT_UPLOAD_PRESET;

  const folder = options?.folder || DEFAULT_FOLDER;
  const apiKey =
    options?.apiKey ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
      : undefined);

  let directError: string | null = null;

  // 1. Attempt direct upload to Cloudinary API
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    if (folder) formData.append('folder', folder);
    if (apiKey) formData.append('api_key', apiKey);
    if (options?.tags && options.tags.length > 0) {
      formData.append('tags', options.tags.join(','));
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const validUrl = data.secure_url || data.url;
      if (validUrl) {
        return {
          success: true,
          url: validUrl,
          publicId: data.public_id,
          format: data.format,
          bytes: data.bytes,
          provider: 'cloudinary',
          fallbackUsed: true,
        };
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      directError =
        errorData.error?.message || `Cloudinary API returned HTTP ${response.status}`;
    }
  } catch (err) {
    directError = err instanceof Error ? err.message : 'Network error during Cloudinary upload';
  }

  // 2. If direct upload failed and backend fallback is enabled, try the backend storage proxy
  if (options?.backendFallback !== false) {
    try {
      const apiBaseUrl =
        (typeof process !== 'undefined'
          ? process.env.NEXT_PUBLIC_API_URL
          : undefined) || 'http://localhost:4000';

      const backendFormData = new FormData();
      backendFormData.append('file', file);
      backendFormData.append('storageProvider', 'cloudinary');

      const backendResponse = await fetch(`${apiBaseUrl}/api/v1/storage/upload`, {
        method: 'POST',
        body: backendFormData,
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        const validUrl =
          backendData.url ||
          (backendData.publicId ? getCloudinaryUrl(backendData.publicId, { cloudName }) : undefined);

        if (validUrl) {
          return {
            success: true,
            url: validUrl,
            publicId: backendData.publicId,
            format: backendData.format,
            bytes: backendData.size,
            provider: 'cloudinary',
            fallbackUsed: true,
          };
        }
      }
    } catch {
      // Backend fallback also failed; return original direct error
    }
  }

  return {
    success: false,
    provider: 'cloudinary',
    fallbackUsed: true,
    error: directError || 'Failed to upload media to Cloudinary',
  };
}

/**
 * Uploads a media file with Cloudinary fallback.
 * 
 * First attempts to upload to IPFS (via Pinata). If IPFS pinning fails or
 * exceeds the timeout, automatically switches to Cloudinary and returns a valid URL.
 * 
 * @param file - The media File object to upload
 * @param options - Upload options including timeout and progress callbacks
 */
export async function uploadMediaWithFallback(
  file: File,
  options?: MediaUploadOptions
): Promise<MediaUploadResult> {
  const ipfsTimeout = options?.ipfsTimeoutMs ?? DEFAULT_IPFS_TIMEOUT_MS;
  const onStateChange = options?.onStateChange;

  // Signal starting IPFS upload
  onStateChange?.({
    status: 'uploading_ipfs',
    provider: 'ipfs',
    message: 'Uploading media to IPFS...',
  });

  const ipfsUploader = options?.customIpfsUploader ?? uploadFileToIPFS;

  let ipfsResult: IpfsUploadResponse | null = null;
  let ipfsFailed = false;
  let ipfsFailureReason = '';

  try {
    // Race IPFS upload against timeout
    const uploadPromise = ipfsUploader(file);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`IPFS pinning timed out after ${ipfsTimeout}ms`)), ipfsTimeout)
    );

    ipfsResult = await Promise.race([uploadPromise, timeoutPromise]);

    if (!ipfsResult.success || !ipfsResult.cid) {
      ipfsFailed = true;
      ipfsFailureReason = ipfsResult.error || 'Unknown IPFS error';
    }
  } catch (error) {
    ipfsFailed = true;
    ipfsFailureReason = error instanceof Error ? error.message : 'IPFS request failed';
  }

  // If IPFS succeeded, return the IPFS response
  if (!ipfsFailed && ipfsResult?.cid) {
    const ipfsUrl = getIpfsGatewayUrl(ipfsResult.cid);
    onStateChange?.({
      status: 'success',
      provider: 'ipfs',
      message: 'Media successfully uploaded to IPFS',
    });

    return {
      success: true,
      url: ipfsUrl,
      cid: ipfsResult.cid,
      provider: 'ipfs',
      fallbackUsed: false,
    };
  }

  // IPFS delayed or failed - proceed to Cloudinary fallback
  onStateChange?.({
    status: 'ipfs_delayed',
    provider: 'cloudinary',
    message: `IPFS unavailable (${ipfsFailureReason}). Switching to Cloudinary fallback...`,
  });

  onStateChange?.({
    status: 'uploading_cloudinary',
    provider: 'cloudinary',
    message: 'Uploading to Cloudinary fallback...',
  });

  const cloudinaryResult = await uploadToCloudinary(file, options);

  if (cloudinaryResult.success && cloudinaryResult.url) {
    onStateChange?.({
      status: 'success',
      provider: 'cloudinary',
      message: 'Media successfully uploaded to Cloudinary fallback',
    });

    return {
      success: true,
      url: cloudinaryResult.url,
      publicId: cloudinaryResult.publicId,
      format: cloudinaryResult.format,
      bytes: cloudinaryResult.bytes,
      provider: 'cloudinary',
      fallbackUsed: true,
    };
  }

  const finalError = `IPFS failed (${ipfsFailureReason}) and Cloudinary fallback failed (${
    cloudinaryResult.error || 'Unknown error'
  })`;

  onStateChange?.({
    status: 'error',
    provider: null,
    error: finalError,
    message: finalError,
  });

  return {
    success: false,
    provider: 'cloudinary',
    fallbackUsed: true,
    error: finalError,
  };
}
