"use client";

import { useEffect, useState, useCallback } from "react";
import { X, FileText, CheckCircle, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ManifestUseCase } from "@/services/manifestUseCases";
import { useDuplicateKeyValidation } from "@/utils/manifestValidation";

type KeyValuePair = {
  key: string;
  value: string;
};

interface Props {
  open: boolean;
  useCase: ManifestUseCase | null;
  onClose: () => void;
  /** Called with the generated JSON string when the user clicks "Generate Manifest". */
  onGenerated?: (content: string) => void;
}

export default function ManifestGeneratorModal({ open, useCase, onClose, onGenerated }: Props) {
  const [pairs, setPairs] = useState<KeyValuePair[]>([{ key: "", value: "" }]);
  const [submitted, setSubmitted] = useState(false);

  const validationRows = pairs.map((pair, index) => ({
    id: String(index),
    key: pair.key,
    value: pair.value
  }));
  const { errors: keyErrors, hasDuplicates } = useDuplicateKeyValidation(validationRows);

  useEffect(() => {
    if (open && useCase) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => {
        setPairs([{ key: "", value: "" }]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, useCase]);

  const handlePairChange = useCallback(
    (index: number, field: "key" | "value", value: string) => {
      setPairs((prev) =>
        prev.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)),
      );
    },
    [],
  );

  const handleAddPair = useCallback(() => {
    setPairs((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const handleRemovePair = useCallback(() => {
    setPairs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasDuplicates) return;
    
    const manifestObj = pairs.reduce((acc, pair) => {
      const key = pair.key.trim();
      if (key) {
        acc[key] = pair.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    const content = JSON.stringify(manifestObj, null, 2);

    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "manifest.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onGenerated?.(content);
    setSubmitted(true);
  }

  function handleClose() {
    setPairs([{ key: "", value: "" }]);
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
            className="relative w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-2xl overflow-hidden"
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
                    className="flex flex-col gap-5"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Build your manifest metadata below. Add or remove key-value pairs.
                      Updates are reflected in the preview. All data is processed client-side until you
                      anchor.
                    </p>

                    <div className="space-y-3">
                      {pairs.map((pair, index) => {
                        const errorId = `manifest-key-error-${index}`;
                        const error = keyErrors[String(index)];

                        return (
                          <div
                            key={index}
                            className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 sm:grid-cols-5 sm:items-start"
                          >
                            <div className="sm:col-span-2 space-y-1">
                              <label
                                className="text-xs font-medium text-gray-600 dark:text-gray-300"
                              >
                                {`Key${pairs.length > 1 ? ` ${index + 1}` : ""}`}
                              </label>
                              <input
                                type="text"
                                value={pair.key}
                                onChange={(e) => handlePairChange(index, "key", e.target.value)}
                                aria-invalid={Boolean(error)}
                                aria-describedby={error ? errorId : undefined}
                                placeholder="Enter key"
                                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900/40 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition ${
                                  error
                                    ? "border-red-400 dark:border-red-600"
                                    : "border-gray-300 dark:border-white/10"
                                }`}
                              />
                              {error && (
                                <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
                                  {error}
                                </p>
                              )}
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <label
                                className="text-xs font-medium text-gray-600 dark:text-gray-300"
                              >
                                Value
                              </label>
                              <input
                                type="text"
                                value={pair.value}
                                onChange={(e) => handlePairChange(index, "value", e.target.value)}
                                placeholder="Enter value"
                                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3 justify-start">
                      <button
                        type="button"
                        onClick={handleAddPair}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                      >
                        <Plus className="h-4 w-4" />
                        Add Pair
                      </button>
                      <button
                        type="button"
                        onClick={handleRemovePair}
                        disabled={pairs.length <= 1}
                        className={`flex items-center gap-2 rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2 text-sm font-medium transition ${
                          pairs.length <= 1
                            ? "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-white/5 cursor-not-allowed"
                            : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        }`}
                      >
                        <Minus className="h-4 w-4" />
                        Remove Pair
                      </button>
                    </div>

                    {/* Live preview panel */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Live preview
                      </h3>
                      <pre
                        className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto overflow-y-auto max-h-48 font-mono"
                        aria-live="polite"
                        aria-label="Manifest JSON preview"
                      >
                        {pairs.length > 0
                          ? JSON.stringify(
                              pairs.reduce((acc, pair) => {
                                const key = pair.key.trim();
                                if (key) acc[key] = pair.value.trim();
                                return acc;
                              }, {} as Record<string, string>),
                              null,
                              2
                            )
                          : "{}"}
                      </pre>
                    </div>

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
                        disabled={hasDuplicates}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow transition ${
                          hasDuplicates
                            ? "bg-gray-400 cursor-not-allowed shadow-none"
                            : "bg-primary hover:shadow-glow"
                        }`}
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
