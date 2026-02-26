/**
 * Advanced Manual Hash Input
 * Allows expert users to enter SHA-256 hashes directly without file upload.
 *
 * @see Issue #70 – Frontend: Advanced Manual Hash Mode
 */
"use client";

import React, { useCallback, useState } from "react";
import { Clipboard, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { validateSHA256, isValidSHA256 } from "@/utils/crypto";
import { useWizard } from "@/context/WizardContext";

interface HashFieldProps {
  label: string;
  tooltip: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  onValidate: () => void;
}

function HashField({ label, tooltip, value, onChange, error, onValidate }: HashFieldProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isValid = isValidSHA256(value);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
    } catch {
      // Clipboard access denied — silent fail
    }
  }, [onChange]);

  return (
    <div className="space-y-2">
      {/* Label + tooltip */}
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            aria-label="Info"
            className="text-gray-400 hover:text-primary transition"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {showTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-800 text-xs text-white shadow-lg z-10">
              {tooltip}
            </div>
          )}
        </div>
      </div>

      {/* Input + paste button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            onBlur={onValidate}
            placeholder="Enter 64-character hex SHA-256 hash"
            spellCheck={false}
            autoComplete="off"
            className={`
              w-full px-3 py-2.5 rounded-xl font-mono text-xs
              border bg-white dark:bg-gray-900/60 transition
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-primary/40
              ${
                error
                  ? "border-red-400 dark:border-red-600"
                  : isValid
                    ? "border-green-400 dark:border-green-600"
                    : "border-gray-300 dark:border-gray-600"
              }
            `}
          />
          {/* Status icon */}
          {value.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-red-500" />
              ) : null}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handlePaste}
          aria-label="Paste from clipboard"
          className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <Clipboard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export default function AdvancedInput() {
  const { state, setAdvancedContentHash, setAdvancedManifestHash } = useWizard();

  const [contentValue, setContentValue] = useState(state.advancedContentHash ?? "");
  const [manifestValue, setManifestValue] = useState(state.advancedManifestHash ?? "");
  const [contentError, setContentError] = useState<string | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);

  const handleContentChange = useCallback(
    (val: string) => {
      setContentValue(val);
      setContentError(null);
      if (isValidSHA256(val)) {
        setAdvancedContentHash(val);
      } else {
        setAdvancedContentHash(null);
      }
    },
    [setAdvancedContentHash],
  );

  const handleManifestChange = useCallback(
    (val: string) => {
      setManifestValue(val);
      setManifestError(null);
      if (val === "") {
        setAdvancedManifestHash(null);
        return;
      }
      if (isValidSHA256(val)) {
        setAdvancedManifestHash(val);
      } else {
        setAdvancedManifestHash(null);
      }
    },
    [setAdvancedManifestHash],
  );

  const validateContent = useCallback(() => {
    if (contentValue === "") {
      setContentError("Content hash is required.");
      return;
    }
    const err = validateSHA256(contentValue);
    setContentError(err);
  }, [contentValue]);

  const validateManifest = useCallback(() => {
    if (manifestValue === "") {
      setManifestError(null); // optional field
      return;
    }
    const err = validateSHA256(manifestValue);
    setManifestError(err);
  }, [manifestValue]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>Advanced Mode</strong> — Enter pre-computed SHA-256 hashes
          directly. No files will be uploaded. Hashes must be 64-character
          hexadecimal strings.
        </p>
      </div>

      <HashField
        label="Content Hash (required)"
        tooltip="The SHA-256 hash of your original content file. Must be a valid 64-character hex string."
        value={contentValue}
        onChange={handleContentChange}
        error={contentError}
        onValidate={validateContent}
      />

      <HashField
        label="Manifest Hash (optional)"
        tooltip="The SHA-256 hash of an associated manifest file. Leave empty if not applicable."
        value={manifestValue}
        onChange={handleManifestChange}
        error={manifestError}
        onValidate={validateManifest}
      />
    </div>
  );
}
