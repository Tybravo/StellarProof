'use client';

import { useWizardStore } from '../store/wizard.store';
import WizardStepper from './WizardStepper';
import WizardNavigation from './WizardNavigation';
import ModeSelection from './steps/ModeSelection';
import StepIdentity from './steps/StepIdentity';
import StepDocuments from './steps/StepDocuments';
import StepReview from './steps/StepReview';

const STEPS = [
  { id: 0, label: 'Mode Selection' },
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Documents' },
  { id: 3, label: 'Review' },
];

export default function WizardPageShell() {
  const {
    currentStep,
    setStep,
    validation,
    resetWizard,
  } = useWizardStore();

  // Hydration guard
 const hasHydrated = useWizardStore((state) => state._hasHydrated);

if (!hasHydrated) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  );
}

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const isCurrentStepValid = validation[currentStep] ?? false;

  const handleNext = () => {
    if (!isCurrentStepValid) return;
    if (!isLastStep) setStep(currentStep + 1);
  };

  const handleBack = () => {
    if (!isFirstStep) setStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!isCurrentStepValid) return;

    try {
      console.log('Submitting wizard data...');
      await new Promise((res) => setTimeout(res, 800));

      resetWizard();
    } catch (error) {
      console.error('Submission failed:', error);
    }
  };

  const handleCancel = () => {
    resetWizard();
  };

  const stepComponents = [
    <ModeSelection key="mode" />,
    <StepIdentity key="identity" />,
    <StepDocuments key="documents" />,
    <StepReview key="review" />,
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      {/* Screen reader live region announces step changes */}
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

          <WizardNavigation
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            isValid={isCurrentStepValid}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
          />
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