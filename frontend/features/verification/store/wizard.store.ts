'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UploadContentData,
  WizardFormData,
} from '../types/wizard.types';

//
// ---- STATE TYPE ----
//

export interface SubmissionResult {
  txHash: string;
  requestId: string;
  certificateId?: string;
  timestamp: string;
}

/** Lifecycle of the verification application as tracked by the wizard. */
export type ApplicationStatus = 'Draft' | 'Minting' | 'Minted';

export interface MintedCertificate {
  certificateId: string;
  txHash: string;
  mintedAt: string;
}

interface WizardState {
  // Navigation
  currentStep: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Form
  formData: WizardFormData;
  updateFormData: <K extends keyof WizardFormData>(
    section: K,
    data: WizardFormData[K]
  ) => void;

  // Upload content helpers (convenience setters)
  setUploadFile: (file: UploadContentData['file']) => void;
  setContentHash: (hash: string | null) => void;
  setHashProgress: (progress: number) => void;
  setIsHashing: (hashing: boolean) => void;
  setManifest: (manifest: UploadContentData['manifest'], manifestHash: string | null) => void;
  setEncryptionEnabled: (enabled: boolean) => void;
  setSPVResult: (result: UploadContentData['spvResult']) => void;

  // Submission state
  isSubmitting: boolean;
  submissionResult: SubmissionResult | null;
  submissionError: string | null;
  setIsSubmitting: (submitting: boolean) => void;
  setSubmissionResult: (result: SubmissionResult | null) => void;
  setSubmissionError: (error: string | null) => void;

  // Minting
  applicationStatus: ApplicationStatus;
  mintedCertificate: MintedCertificate | null;
  mintError: string | null;
  /** Marks a mint as in flight and clears any previous mint error. */
  startMint: () => void;
  /** Records a failed mint. Wizard data is kept so the user can retry. */
  failMint: (error: string) => void;
  /** On success: clears wizard data and moves the application to "Minted". */
  completeMint: (certificate: MintedCertificate) => void;

  // Validation
  validation: Record<number, boolean>;
  setStepValid: (step: number, valid: boolean) => void;

  // Reset
  resetWizard: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const defaultContent: UploadContentData = {
  file: null,
  contentHash: null,
  hashProgress: 0,
  isHashing: false,
  manifest: null,
  manifestHash: null,
  encryptionEnabled: true,
  spvResult: null,
};

/** Wizard data that is discarded on both a manual reset and a completed mint. */
const clearedWizardState = {
  currentStep: 0,
  formData: {} as WizardFormData,
  validation: {} as Record<number, boolean>,
  isSubmitting: false,
  submissionResult: null,
  submissionError: null,
};

//
// ---- STORE ----
//

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      //
      // Navigation
      //
      currentStep: 0,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () =>
        set((state) => ({
          currentStep: state.currentStep + 1,
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(0, state.currentStep - 1),
        })),

      //
      // Form
      //
      formData: {},

      updateFormData: (section, data) =>
        set((state) => ({
          formData: {
            ...state.formData,
            [section]: data,
          },
        })),

      //
      // Upload content helpers
      //
      setUploadFile: (file) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, file },
          },
        })),

      setContentHash: (contentHash) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, contentHash, isHashing: false },
          },
        })),

      setHashProgress: (hashProgress) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, hashProgress },
          },
        })),

      setIsHashing: (isHashing) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, isHashing },
          },
        })),

      setManifest: (manifest, manifestHash) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, manifest, manifestHash },
          },
        })),

      setEncryptionEnabled: (encryptionEnabled) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, encryptionEnabled },
          },
        })),

      setSPVResult: (spvResult) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: { ...defaultContent, ...state.formData.content, spvResult },
          },
        })),

      //
      // Submission state
      //
      isSubmitting: false,
      submissionResult: null,
      submissionError: null,

      setIsSubmitting: (isSubmitting) => set({ isSubmitting }),

      setSubmissionResult: (submissionResult) => set({ submissionResult, submissionError: null }),

      setSubmissionError: (submissionError) => set({ submissionError, submissionResult: null }),

      //
      // Minting
      //
      applicationStatus: 'Draft',
      mintedCertificate: null,
      mintError: null,

      startMint: () => set({ applicationStatus: 'Minting', mintError: null }),

      failMint: (mintError) => set({ applicationStatus: 'Draft', mintError }),

      completeMint: (mintedCertificate) =>
        set({
          ...clearedWizardState,
          applicationStatus: 'Minted',
          mintedCertificate,
          mintError: null,
        }),

      //
      // Validation
      //
      validation: {},

      setStepValid: (step, valid) =>
        set((state) => ({
          validation: {
            ...state.validation,
            [step]: valid,
          },
        })),

      //
      // Reset
      //
      resetWizard: () =>
        set({
          ...clearedWizardState,
          applicationStatus: 'Draft',
          mintedCertificate: null,
          mintError: null,
        }),

      //
      // Hydration
      //
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'wizard-storage',

      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);