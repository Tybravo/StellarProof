"use client";

import { useEffect, useState, useCallback } from "react";
import { X, FileText, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ManifestUseCase } from "@/services/manifestUseCases";
import KeyValueBuilder from "@/components/KeyValueBuilder";
import {
  type ManifestKeyRow,
  useDuplicateKeyValidation,
} from "@/utils/manifestValidation";

interface Props {
  open: boolean;
  useCase: ManifestUseCase | null;
  onClose: () => void;
}

export default function ManifestGeneratorModal({ open, useCase, onClose }: Props) {
  const [rows, setRows] = useState<ManifestKeyRow[]>([]);
  const [submitted, setSubmitted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [manifestData, setManifestData] = useState<Record<string, string>>({});

  const { errors: keyErrors, hasDuplicates } = useDuplicateKeyValidation(rows);

  useEffect(() => {
    if (open && useCase) {
      // Use setTimeout to avoid synchronous state update warning
      const timer = setTimeout(() => {
        setRows(
          useCase.template.fields.map((field, index) => ({
            id: `${useCase.id}-${index}`,
            key: field,
            value: "",
          })),
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, useCase]);

  // Update manifestData whenever rows change to keep preview in sync if needed
  useEffect(() => {
    const data: Record<string, string> = {};
    rows.forEach(row => {
      if (row.key) data[row.key] = row.value;
    });
    // Use setTimeout to avoid synchronous state update warning
    const timer = setTimeout(() => {
      setManifestData(data);
    }, 0);
    return () => clearTimeout(timer);
  }, [rows]);

  const handleRowChange = useCallback(
    (id: string, field: "key" | "value", value: string) => {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
      );
    },
    [],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasDuplicates) return;
    setSubmitted(true);
  }

  function handleClose() {
    setRows([]);
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
                      Build your manifest metadata below. Add, edit, or reorder key-value pairs.
                      Updates are reflected in the preview. All data is processed client-side until you
                      anchor.
                    </p>
                    <KeyValueBuilder rows={rows} errors={keyErrors} onChange={handleRowChange} />

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
                        {rows.length > 0
                          ? JSON.stringify(
                              rows.reduce((acc, row) => {
                                if (row.key) acc[row.key] = row.value;
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
