/**
 * Manifest Attachment Step
 * Upload, parse, validate, and hash a manifest file (.json or .xml).
 *
 * @see Issue #72 – Frontend: Manifest Attachment Section
 */
"use client";

import React, { useCallback, useState } from "react";
import {
  Upload,
  FileJson,
  FileCode2,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { computeSHA256 } from "../../../utils/crypto";
import { useWizard, type ManifestData } from "../../../context/WizardContext";

const ACCEPTED_EXTENSIONS = [".json", ".xml"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Attempt to detect and validate JSON or XML content.
 * Returns the detected format or throws with a descriptive error.
 */
function parseAndValidate(
  content: string,
  fileName: string,
): ManifestData["format"] {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    JSON.parse(content); // throws on invalid JSON
    return "json";
  }

  if (ext === "xml") {
    if (typeof DOMParser !== "undefined") {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "application/xml");
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        throw new Error("Invalid XML: " + parseError.textContent?.slice(0, 120));
      }
    }
    return "xml";
  }

  throw new Error(`Unsupported file format ".${ext}". Only .json and .xml are accepted.`);
}

export default function ManifestStep() {
  const { state, setManifest } = useWizard();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);

      try {
        const content = await file.text();
        const format = parseAndValidate(content, file.name);
        const hash = await computeSHA256(content);

        setManifest(
          {
            content,
            format,
            fileName: file.name,
            fileSize: file.size,
          },
          hash,
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse manifest file.";
        setError(message);
        setManifest(null, null);
      } finally {
        setIsProcessing(false);
      }
    },
    [setManifest],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = ""; // allow re-upload of same file
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleReset = useCallback(() => {
    setManifest(null, null);
    setError(null);
  }, [setManifest]);

  const hasManifest = state.manifest !== null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Upload Zone */}
      {!hasManifest && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/60 hover:bg-primary/5 cursor-pointer transition-all"
        >
          <label className="flex flex-col items-center gap-3 cursor-pointer w-full">
            <Upload className="w-10 h-10 text-primary" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop a manifest file, or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Accepted formats: .json, .xml
            </p>
            <input
              type="file"
              className="hidden"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              onChange={handleInputChange}
            />
          </label>
        </div>
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Parsing and hashing manifest…</span>
        </div>
      )}

      {/* Parsed manifest info */}
      {hasManifest && state.manifest && state.manifestHash && (
        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-3">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Remove manifest"
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex items-center gap-3">
            {state.manifest.format === "json" ? (
              <FileJson className="w-10 h-10 text-primary/70" />
            ) : (
              <FileCode2 className="w-10 h-10 text-primary/70" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                {state.manifest.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(state.manifest.fileSize)} &middot;{" "}
                {state.manifest.format.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Hash display */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                Manifest SHA-256 Hash
              </p>
              <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
                {state.manifestHash}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
