"use client";

import { useState } from "react";
import { X, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ManifestUseCase } from "@/services/manifestUseCases";

interface Props {
  open: boolean;
  useCase: ManifestUseCase | null;
  onClose: () => void;
}

function FieldLabel({ label }: { label: string }) {
  const formatted = label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {formatted}
    </label>
  );
}

export default function ManifestGeneratorModal({ open, useCase, onClose }: Props) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(field: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleClose() {
    setFieldValues({});
    setSubmitted(false);
    onClose();
  }

  if (!open || !useCase) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manifest-modal-title"
            className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2
                    id="manifest-modal-title"
                    className="text-base font-semibold text-gray-900 dark:text-white"
                  >
                    {useCase.template.title}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {useCase.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 py-8 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Manifest Generated!
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your <span className="font-medium text-primary">{useCase.title}</span> manifest
                        has been prepared and is ready to be anchored to the Stellar blockchain.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-button-glow hover:shadow-glow transition"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Fill in the fields below to generate your manifest. All data is processed
                      client-side; nothing is sent to a server until you anchor.
                    </p>
                    {useCase.template.fields.map((field) => (
                      <div key={field}>
                        <FieldLabel label={field} />
                        <input
                          type="text"
                          id={`field-${field}`}
                          name={field}
                          value={fieldValues[field] ?? ""}
                          onChange={(e) => handleChange(field, e.target.value)}
                          placeholder={`Enter ${field.replace(/([A-Z])/g, " $1").toLowerCase()}…`}
                          className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                        />
                      </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="flex-1 rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow hover:shadow-glow transition"
                      >
                        Generate Manifest
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
