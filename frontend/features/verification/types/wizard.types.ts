export type WizardStep = 0 | 1 | 2;

export interface IdentityData {
  issuerAddress: string;
}

export interface DocumentsData {
  assetCode: string;
  amount: string;
  proofHash: string;
}

export interface WizardFormData {
  identity?: IdentityData;
  documents?: DocumentsData;
}

export type StepValidationMap = Record<number, boolean>;