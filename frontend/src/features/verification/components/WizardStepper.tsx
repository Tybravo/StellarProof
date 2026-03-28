interface Step {
  id: number;
  label: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
}

export default function WizardStepper({
  steps,
  currentStep,
}: WizardStepperProps) {
  return (
    <div className="flex justify-between relative mb-12">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={step.id} className="flex-1 flex flex-col items-center relative z-10">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all
              ${
                isCompleted
                  ? 'bg-green-600 border-green-600 text-white'
                  : isActive
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500'
              }`}
            >
              {index + 1}
            </div>

            <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {step.label}
            </span>
          </div>
        );
      })}

      <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-800 -z-0" />
    </div>
  );
}