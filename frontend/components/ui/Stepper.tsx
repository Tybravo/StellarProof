"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../utils/cn";

interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  className,
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:justify-between w-full">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = currentStep === index;
          const isPending = !isCompleted && !isActive;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={index}
              className={cn(
                "relative flex flex-row md:flex-col items-center flex-1 w-full md:w-auto",
                !isLast && "after:content-[''] after:absolute after:transition-colors duration-200",
                !isLast && "after:left-5 after:top-10 after:w-[2px] after:h-[calc(2rem)] md:after:h-0",
                !isLast && (isCompleted && completedSteps.includes(index + 1) ? "after:bg-green-500" : "after:bg-gray-200 dark:after:bg-zinc-800"),
                !isLast && "md:after:left-[calc(50%+1.25rem)] md:after:top-5 md:after:w-[calc(100%-2.5rem)] md:after:h-[2px]",
                !isLast && (isCompleted && completedSteps.includes(index + 1) ? "md:after:bg-green-500" : "md:after:bg-gray-200 dark:md:after:bg-zinc-800")
              )}
            >
              <button
                disabled={!isCompleted && !isActive}
                onClick={() => isCompleted && onStepClick?.(index)}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 z-10",
                  isActive && "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/20",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  isPending && "border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-400 dark:text-zinc-500",
                  isCompleted && "hover:bg-green-600 hover:border-green-600 cursor-pointer"
                )}
              >
                {isCompleted ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </button>

              {/* Label */}
              <div className="ml-4 md:ml-0 md:mt-3 flex flex-col items-start md:items-center">
                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-200",
                    isActive && "text-blue-500 font-bold",
                    isCompleted && "text-green-500",
                    isPending && "text-gray-400 dark:text-zinc-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
