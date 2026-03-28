"use client";

import React, { useState } from "react";
import { Stepper } from "../../components/ui/Stepper";

export default function StepperDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { label: "Project Info" },
    { label: "TEE Selection" },
    { label: "Manifest Details" },
    { label: "Verification" },
    { label: "Submission" },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps((prev) => Array.from(new Set([...prev, currentStep])));
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Stepper Component Demo</h1>
          <p className="text-gray-500">Test the multi-step progress component</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />

          <div className="mt-12 p-8 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                Step {currentStep + 1}: {steps[currentStep].label}
              </h2>
              <p className="text-gray-500">Content for {steps[currentStep].label} goes here.</p>
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
