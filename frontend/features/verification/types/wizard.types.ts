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
  file: FileInfo | null;
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