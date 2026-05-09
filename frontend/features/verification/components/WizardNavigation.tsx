interface WizardNavigationProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  isValid: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function WizardNavigation({
  isFirstStep,
  isLastStep,
  isValid,
  onBack,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  return (
    <div className="mt-12 flex justify-between border-t border-gray-200 dark:border-gray-800 pt-8">
      <button
        type="button"
        onClick={onBack}
        disabled={isFirstStep}
        aria-label="Go to previous step"
        className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Back
      </button>

      {!isLastStep ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          aria-label={!isValid ? "Complete this step to continue" : "Go to next step"}
          aria-disabled={!isValid}
          className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Next
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid}
          aria-label={!isValid ? "Complete this step to submit" : "Submit verification request"}
          aria-disabled={!isValid}
          className="px-8 py-2 bg-green-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
        >
          Submit
        </button>
      )}
    </div>
  );
}