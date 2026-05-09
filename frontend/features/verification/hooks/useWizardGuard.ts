'use client';

import { useCallback } from 'react';
import { useWizardStore } from '../store/wizard.store';

export const useWizardGuard = (totalSteps: number) => {
  const {
    currentStep,
    validation,
    setStep,
    nextStep,
    prevStep,
  } = useWizardStore();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isCurrentStepValid = validation[currentStep] ?? false;

  const goToStep = useCallback(
    (targetStep: number) => {
      if (targetStep < 0 || targetStep >= totalSteps) return;

      if (targetStep > currentStep) {
        for (let i = 0; i < targetStep; i++) {
          if (!validation[i]) return;
        }
      }

      setStep(targetStep);
    },
    [currentStep, validation, setStep, totalSteps]
  );

  const safeNext = useCallback(() => {
    if (!isCurrentStepValid) return;
    nextStep();
  }, [isCurrentStepValid, nextStep]);

  const safeBack = useCallback(() => {
    if (!isFirstStep) prevStep();
  }, [isFirstStep, prevStep]);

  return {
    currentStep,
    isFirstStep,
    isLastStep,
    isCurrentStepValid,
    goToStep,
    safeNext,
    safeBack,
  };
};