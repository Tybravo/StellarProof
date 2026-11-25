import { Check, LoaderCircle } from 'lucide-react';

export type WorkflowStage = 'Requested' | 'Processing' | 'Attested';

export interface WorkflowStepperProps {
  stage: WorkflowStage;
}

const STEPS: Array<{ stage: WorkflowStage; label: string }> = [
  { stage: 'Requested', label: 'Requested' },
  { stage: 'Processing', label: 'SPV Processing' },
  { stage: 'Attested', label: 'Attested on-chain' },
];

export default function WorkflowStepper({ stage }: WorkflowStepperProps) {
  const current = STEPS.findIndex((step) => step.stage === stage);

  return (
    <nav aria-label="SPV workflow progress" className="w-full">
      <ol className="grid grid-cols-3" role="list">
        {STEPS.map((step, index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <li key={step.stage} className="relative min-w-0 text-center">
              {index > 0 && (
                <span
                  className={`absolute right-1/2 top-5 h-0.5 w-full ${index <= current ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold ${
                  complete
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : active
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-950'
                }`}
                aria-current={active ? 'step' : undefined}
              >
                {complete ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : active && stage === 'Processing' ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className={`mt-2 block truncate px-1 text-xs font-medium ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                {step.label}
              </span>
              <span className="sr-only">{complete ? ' completed' : active ? ' current' : ' upcoming'}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
