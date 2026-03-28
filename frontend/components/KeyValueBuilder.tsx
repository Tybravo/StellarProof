"use client";

import React from "react";
import type { ManifestKeyRow } from "@/utils/manifestValidation";

interface KeyValueBuilderProps {
  rows: ManifestKeyRow[];
  errors: Record<string, string | null>;
  onChange: (id: string, field: "key" | "value", value: string) => void;
}

export default function KeyValueBuilder({ rows, errors, onChange }: KeyValueBuilderProps) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const error = errors[row.id];
        const keyInputId = `manifest-key-${row.id}`;
        const valueInputId = `manifest-value-${row.id}`;
        const errorId = `manifest-key-error-${row.id}`;

        return (
          <div
            key={row.id}
            className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 sm:grid-cols-5 sm:items-start"
          >
            <div className="sm:col-span-2 space-y-1">
              <label
                htmlFor={keyInputId}
                className="text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                {`Key${rows.length > 1 ? ` ${index + 1}` : ""}`}
              </label>
              <input
                id={keyInputId}
                type="text"
                value={row.key}
                onChange={(e) => onChange(row.id, "key", e.target.value)}
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
                htmlFor={valueInputId}
                className="text-xs font-medium text-gray-600 dark:text-gray-300"
              >
                Value
              </label>
              <input
                id={valueInputId}
                type="text"
                value={row.value}
                onChange={(e) => onChange(row.id, "value", e.target.value)}
                placeholder="Enter value"
                className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
