'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

//
// ---- FORM TYPES ----
//

interface IdentityData {
  issuerAddress: string;
}

interface DocumentsData {
  assetCode: string;
  amount: string;
  proofHash: string;
}

interface VerificationData {
  mode: string;
}

interface WizardFormData {
  identity?: IdentityData;
  documents?: DocumentsData;
  verification?: VerificationData;
}

//
// ---- STATE TYPE ----
//

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

  // Validation
  validation: Record<number, boolean>;
  setStepValid: (step: number, valid: boolean) => void;

  // Reset
  resetWizard: () => void;

  // Hydration
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

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