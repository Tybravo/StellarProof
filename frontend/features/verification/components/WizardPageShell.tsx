'use client';

import { useState, useCallback } from 'react';
import { useWizardStore } from '../store/wizard.store';
import WizardStepper from './WizardStepper';
import WizardNavigation from './WizardNavigation';
import UploadMedia from './steps/UploadMedia';
import UploadManifest from './steps/UploadManifest';
import UploadSPVOptions from './steps/UploadSPVOptions';
import UploadReview from './steps/UploadReview';
import { submitVerificationRequest } from '@/services/verificationService';

const STEPS = [
  { id: 0, label: 'Media Upload' },
  { id: 1, label: 'Manifest Attachment' },
  { id: 2, label: 'SPV Privacy' },
  { id: 3, label: 'Review & Submit' },
];

export default function WizardPageShell() {
  const {
    currentStep,
    setStep,
    validation,
    formData,
    resetWizard,
  } = useWizardStore();

  const hasHydrated = useWizardStore((state) => state._hasHydrated);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const isCurrentStepValid = validation[currentStep] ?? false;

  const handleNext = useCallback(() => {
    const step = currentStep;
    if (!validation[step]) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  }, [currentStep, validation, setStep]);

  const handleBack = useCallback(() => {
    const step = currentStep;
    if (step > 0) setStep(step - 1);
  }, [currentStep, setStep]);

  const handleNavigate = useCallback(
    (step: number) => {
      setStep(step);
    },
    [setStep],
  );

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const content = formData.content;
      await submitVerificationRequest(
        content?.contentHash ?? '',
        content?.manifestHash ?? null,
        'GAAAAAAAAAAAAAAA',
      );
      resetWizard();
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData.content, resetWizard]);

  const handleCancel = useCallback(() => {
    resetWizard();
  }, [resetWizard]);

  const stepComponents = [
    <UploadMedia key="media" />,
    <UploadManifest key="manifest" />,
    <UploadSPVOptions key="spv" />,
    <UploadReview
      key="review"
      onNavigate={handleNavigate}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />,
  ];

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Step ${currentStep + 1} of ${STEPS.length}: ${STEPS[currentStep].label}`}
      </div>

      <main id="main-content" className="container mx-auto max-w-4xl px-4 py-12">
        <WizardStepper
          steps={STEPS}
          currentStep={currentStep}
        />

        <div className="mt-10 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 shadow-xl min-h-[400px]">
          <h2
            id="wizard-step-heading"
            className="text-2xl font-bold mb-8 text-gray-900 dark:text-white"
            tabIndex={-1}
          >
            {STEPS[currentStep].label}
          </h2>

          <div className="min-h-[200px]" aria-labelledby="wizard-step-heading">
            {stepComponents[currentStep]}
          </div>

          {!isLastStep ? (
            <WizardNavigation
              isFirstStep={isFirstStep}
              isLastStep={false}
              isValid={isCurrentStepValid}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="mt-12 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-8">
              <button
                type="button"
                onClick={handleBack}
                disabled={isFirstStep}
                aria-label="Go to previous step"
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Back
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel and reset the wizard"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
          >
            Cancel & Reset Wizard
          </button>
        </div>
      </main>
    </div>
  );
}
