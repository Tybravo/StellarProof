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
        onClick={onBack}
        disabled={isFirstStep}
        className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-40"
      >
        Back
      </button>

      {!isLastStep ? (
        <button
          onClick={onNext}
          disabled={!isValid}
          className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-opacity"
        >
          Next
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!isValid}
          className="px-8 py-2 bg-green-600 text-white font-semibold rounded-lg disabled:opacity-50 transition-opacity"
        >
          Submit
        </button>
      )}
    </div>
  );
}