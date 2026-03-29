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
    <nav aria-label="Verification wizard progress">
      <ol className="flex justify-between relative mb-12" role="list">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const stepStatus = isCompleted ? 'completed' : isActive ? 'current' : 'upcoming';

          return (
            <li
              key={step.id}
              className="flex-1 flex flex-col items-center relative z-10"
              aria-current={isActive ? 'step' : undefined}
            >
              <div
                aria-label={`Step ${index + 1}: ${step.label} — ${stepStatus}`}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all
                ${
                  isCompleted
                    ? 'bg-green-600 border-green-600 text-white'
                    : isActive
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500'
                }`}
              >
                <span aria-hidden="true">{index + 1}</span>
                {isCompleted && <span className="sr-only">Completed</span>}
              </div>

              <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {step.label}
              </span>
            </li>
          );
        })}

        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 dark:bg-gray-800 -z-0" aria-hidden="true" />
      </ol>
    </nav>
  );
}