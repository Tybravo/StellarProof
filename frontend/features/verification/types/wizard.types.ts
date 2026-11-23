export type WizardStep = 0 | 1 | 2 | 3;

export interface IdentityData {
  issuerAddress: string;
}

export interface DocumentsData {
  assetCode: string;
  amount: string;
  proofHash: string;
}

export interface VerificationData {
  mode: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface ManifestData {
  content: string;
  format: 'json' | 'xml';
  fileName: string;
  fileSize: number;
}

export interface SPVResult {
  encryptedHash: string;
  storageId: string;
}

export interface UploadContentData {
  mediaCid?: string | null;
  manifestCid?: string | null;
  file: FileInfo | null;
  fileError?: string | null;
  contentHash: string | null;
  hashProgress: number;
  isHashing: boolean;
  manifest: ManifestData | null;
  manifestHash: string | null;
  encryptionEnabled: boolean;
  spvResult: SPVResult | null;
}

export interface WizardFormData {
  identity?: IdentityData;
  documents?: DocumentsData;
  verification?: VerificationData;
  content?: UploadContentData;
}

export type StepValidationMap = Record<number, boolean>;

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

export const Supported_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
] as const;

export type SupportedMimeType = (typeof Supported_MIME_TYPES)[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}
