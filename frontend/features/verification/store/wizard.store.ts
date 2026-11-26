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

export type VerificationStage = 'Idle' | 'Requested' | 'Processing' | 'Attested' | 'Minted' | 'Failed';

interface WizardState {
  verificationStage: VerificationStage;
  setVerificationStage: (stage: VerificationStage) => void;
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

  // IPFS content helpers
  setMediaCid: (cid: string | null) => void;
  setManifestCid: (cid: string | null) => void;
  setIpfsUploadState: (state: { isUploading?: boolean; error?: string | null }) => void;

  // Submission state
  isSubmitting: boolean;
  submissionResult: SubmissionResult | null;
  submissionError: string | null;
  setIsSubmitting: (submitting: boolean) => void;
  setSubmissionResult: (result: SubmissionResult | null) => void;
  setSubmissionError: (error: string | null) => void;

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
  mediaCid: null,
  manifestCid: null,
  isIpfsUploading: false,
  ipfsError: null,
};

//
// ---- STORE ----
//

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      verificationStage: 'Idle',
      setVerificationStage: (verificationStage) => set({ verificationStage }),
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

      setMediaCid: (mediaCid) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: {
              ...defaultContent,
              ...state.formData.content,
              mediaCid,
              isIpfsUploading: false,
              ipfsError: null,
            },
          },
        })),

      setManifestCid: (manifestCid) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: {
              ...defaultContent,
              ...state.formData.content,
              manifestCid,
              isIpfsUploading: false,
              ipfsError: null,
            },
          },
        })),

      setIpfsUploadState: ({ isUploading, error }) =>
        set((state) => ({
          formData: {
            ...state.formData,
            content: {
              ...defaultContent,
              ...state.formData.content,
              ...(isUploading !== undefined ? { isIpfsUploading: isUploading } : {}),
              ...(error !== undefined ? { ipfsError: error } : {}),
            },
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
          currentStep: 0,
          formData: {},
          validation: {},
          isSubmitting: false,
          submissionResult: null,
          submissionError: null,
          verificationStage: 'Idle',
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
