/**
 * Manifest Attachment Step
 * Upload, parse, validate, and hash a manifest file (.json or .xml).
 * Alternatively, open the Manifest Generator to build one from scratch —
 * the generated content and computed hash flow back into the wizard fields
 * automatically.
 *
 * @see Issue #72 – Frontend: Manifest Attachment Section
 * @see Issue #73 – Connect Manifest Generator Modal into Wizard Flow
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
  Wand2,
  FolderUp,
} from "lucide-react";
import { computeSHA256 } from "../../../utils/crypto";
import { useWizard, type ManifestData } from "../../../context/WizardContext";
import ManifestGeneratorModal from "../../ManifestGeneratorModal";
import { manifestUseCaseService, type ManifestUseCase } from "../../../services/manifestUseCases";

/* ------------------------------------------------------------------ */
/*                            Constants                                */
/* ------------------------------------------------------------------ */

const ACCEPTED_EXTENSIONS = [".json", ".xml"];

type Mode = "upload" | "generator";

/* ------------------------------------------------------------------ */
/*                            Helpers                                  */
/* ------------------------------------------------------------------ */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseAndValidate(
  content: string,
  fileName: string,
): ManifestData["format"] {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    JSON.parse(content);
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

  throw new Error(
    `Unsupported file format ".${ext}". Only .json and .xml are accepted.`,
  );
}

/* ------------------------------------------------------------------ */
/*                         Main Component                              */
/* ------------------------------------------------------------------ */

export default function ManifestStep() {
  const { state, setManifest } = useWizard();

  // ── Mode toggle ──
  const [mode, setMode] = useState<Mode>("upload");

  // ── Upload state ──
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Generator modal state ──
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<ManifestUseCase | null>(null);
  const [generatorLoading, setGeneratorLoading] = useState(false);

  const hasManifest = state.manifest !== null;

  /* ── Upload handlers ── */

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
      e.target.value = "";
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

  /* ── Generator handlers ── */

  const handleOpenGenerator = useCallback(async () => {
    setGeneratorLoading(true);
    try {
      // Default to first use-case (digital-art) if none selected yet
      if (!selectedUseCase) {
        const useCases = await manifestUseCaseService.getAll();
        if (useCases.length > 0) {
          setSelectedUseCase(useCases[0]);
        }
      }
    } finally {
      setGeneratorLoading(false);
      setGeneratorOpen(true);
    }
  }, [selectedUseCase]);

  /**
   * Called by ManifestGeneratorModal when the user clicks "Generate Manifest".
   * The modal's internal `submitted` state already captures the rows; here we
   * take the JSON content, hash it, and push it into the wizard as a synthetic
   * .json manifest so the rest of the wizard treats it exactly like an upload.
   *
   * The modal fires onClose after success — we intercept via onGenerated before
   * that happens by patching the modal's close flow through our own close handler.
   */
  const handleGeneratorClose = useCallback(() => {
    setGeneratorOpen(false);
    // selectedUseCase intentionally kept so re-opening resumes the same template
  }, []);

  /**
   * After the generator produces a manifest, synthesise a ManifestData entry
   * so the wizard fields (filename, hash) are auto-filled.
   *
   * This is triggered from the modal's "Done" button via the onGenerated prop.
   */
  const handleGenerated = useCallback(
    async (content: string) => {
      setError(null);
      setIsProcessing(true);
      try {
        // Validate the generated JSON is parseable
        JSON.parse(content);
        const hash = await computeSHA256(content);
        const fileName = `${selectedUseCase?.id ?? "manifest"}.json`;
        setManifest(
          {
            content,
            format: "json",
            fileName,
            fileSize: new TextEncoder().encode(content).byteLength,
          },
          hash,
        );
        setGeneratorOpen(false);
        // Switch back to upload view so the manifest card is visible
        setMode("upload");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to process generated manifest.";
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedUseCase, setManifest],
  );

  /* ── Mode switch: never lose wizard state ── */
  const handleModeSwitch = useCallback(
    (next: Mode) => {
      setError(null);
      setMode(next);
      if (next === "generator") {
        handleOpenGenerator();
      }
    },
    [handleOpenGenerator],
  );

  /* ---------------------------------------------------------------- */
  /*                             Render                               */
  /* ---------------------------------------------------------------- */

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">

      {/* ── Mode toggle tabs ── */}
      <div
        role="tablist"
        aria-label="Manifest source"
        className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
      >
        <button
          role="tab"
          type="button"
          aria-selected={mode === "upload"}
          onClick={() => mode !== "upload" && setMode("upload")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === "upload"
              ? "bg-white dark:bg-darkblue shadow-sm text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <FolderUp className="w-4 h-4 shrink-0" aria-hidden />
          Upload File
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === "generator"}
          onClick={() => handleModeSwitch("generator")}
          disabled={generatorLoading}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === "generator"
              ? "bg-white dark:bg-darkblue shadow-sm text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {generatorLoading ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
          ) : (
            <Wand2 className="w-4 h-4 shrink-0" aria-hidden />
          )}
          Create New Manifest
        </button>
      </div>

      {/* ── Upload mode ── */}
      {mode === "upload" && (
        <>
          {/* Upload drop zone — hidden once a manifest is attached */}
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

          {/* Parsed manifest card */}
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

              {/* Allow switching to generator even after upload, without losing state */}
              <button
                type="button"
                onClick={() => handleModeSwitch("generator")}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden />
                Switch to Manifest Generator instead
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Generator mode placeholder ── */}
      {mode === "generator" && !generatorOpen && !hasManifest && (
        <div className="flex flex-col items-center gap-3 py-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Wand2 className="w-10 h-10 text-primary/60" aria-hidden />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open the generator to build your manifest
          </p>
          <button
            type="button"
            onClick={handleOpenGenerator}
            disabled={generatorLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm font-semibold text-white shadow-button-glow hover:shadow-glow transition disabled:opacity-50"
          >
            {generatorLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="w-4 h-4" aria-hidden />
            )}
            Open Generator
          </button>
        </div>
      )}

      {/* ── Manifest card shown in generator mode after generation ── */}
      {mode === "generator" && hasManifest && state.manifest && state.manifestHash && (
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
            <FileJson className="w-10 h-10 text-primary/70" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                {state.manifest.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(state.manifest.fileSize)} &middot; JSON &middot;{" "}
                <span className="text-primary">Generated</span>
              </p>
            </div>
          </div>

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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenGenerator}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" aria-hidden />
              Re-open Generator
            </button>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5" aria-hidden />
              Switch to file upload
            </button>
          </div>
        </div>
      )}

      {/* ── Error display ── */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ── Manifest Generator Modal ── */}
      <ManifestGeneratorModal
        open={generatorOpen}
        useCase={selectedUseCase}
        onClose={handleGeneratorClose}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
