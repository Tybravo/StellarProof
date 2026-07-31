'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { computeSHA256 } from '@/utils/crypto';
import { useWizardStore } from '../../store/wizard.store';
import type { ManifestData } from '../../types/wizard.types';
import ManifestGeneratorModal from '@/components/ManifestGeneratorModal';
import { manifestUseCaseService } from '@/services/manifestUseCases';
import type { ManifestUseCase } from '@/services/manifestUseCases';

const ACCEPTED_EXTENSIONS = ['.json', '.xml'];

type Mode = 'upload' | 'generator';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseAndValidate(content: string, fileName: string): ManifestData['format'] {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    JSON.parse(content);
    return 'json';
  }

  if (ext === 'xml') {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Invalid XML: ' + parseError.textContent?.slice(0, 120));
      }
    }
    return 'xml';
  }

  throw new Error(`Unsupported file format ".${ext}". Only .json and .xml are accepted.`);
}

export default function UploadManifest() {
  const { formData, setManifest, setStepValid } = useWizardStore();
  const content = formData.content;

  const [mode, setMode] = useState<Mode>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<ManifestUseCase | null>(null);
  const [generatorLoading, setGeneratorLoading] = useState(false);

  useEffect(() => {
    setStepValid(1, true);
  }, [setStepValid]);

  const hasManifest = content?.manifest !== null && content?.manifest !== undefined;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);
      try {
        const fileContent = await file.text();
        const format = parseAndValidate(fileContent, file.name);
        const hash = await computeSHA256(fileContent);

        setManifest(
          {
            content: fileContent,
            format,
            fileName: file.name,
            fileSize: file.size,
          },
          hash,
        );
        setStepValid(1, true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse manifest file.';
        setError(message);
        setManifest(null, null);
        setStepValid(1, false);
      } finally {
        setIsProcessing(false);
      }
    },
    [setManifest, setStepValid],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
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
    setStepValid(1, false);
  }, [setManifest, setStepValid]);

  const handleOpenGenerator = useCallback(async () => {
    setGeneratorLoading(true);
    try {
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

  const handleGeneratorClose = useCallback(() => {
    setGeneratorOpen(false);
  }, []);

  const handleGenerated = useCallback(
    async (genContent: string) => {
      setError(null);
      setIsProcessing(true);
      try {
        JSON.parse(genContent);
        const hash = await computeSHA256(genContent);
        const fileName = `${selectedUseCase?.id ?? 'manifest'}.json`;
        setManifest(
          {
            content: genContent,
            format: 'json',
            fileName,
            fileSize: new TextEncoder().encode(genContent).byteLength,
          },
          hash,
        );
        setStepValid(1, true);
        setGeneratorOpen(false);
        setMode('upload');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to process generated manifest.';
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedUseCase, setManifest, setStepValid],
  );

  const handleModeSwitch = useCallback(
    (next: Mode) => {
      setError(null);
      setMode(next);
      if (next === 'generator') {
        handleOpenGenerator();
      }
    },
    [handleOpenGenerator],
  );

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div
        role="tablist"
        aria-label="Manifest source"
        className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10"
      >
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'upload'}
          onClick={() => mode !== 'upload' && setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === 'upload'
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <FolderUp className="w-4 h-4 shrink-0" aria-hidden />
          Upload File
        </button>
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'generator'}
          onClick={() => handleModeSwitch('generator')}
          disabled={generatorLoading}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            mode === 'generator'
              ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
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

      {mode === 'upload' && (
        <>
          {!hasManifest && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-all"
            >
              <label className="flex flex-col items-center gap-3 cursor-pointer w-full">
                <Upload className="w-10 h-10 text-blue-600" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drop a manifest file, or click to browse
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Accepted formats: .json, .xml
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleInputChange}
                />
              </label>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Parsing and hashing manifest…</span>
            </div>
          )}

          {hasManifest && content?.manifest && content?.manifestHash && (
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
                {content.manifest.format === 'json' ? (
                  <FileJson className="w-10 h-10 text-blue-600/70" />
                ) : (
                  <FileCode2 className="w-10 h-10 text-blue-600/70" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                    {content.manifest.fileName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(content.manifest.fileSize)} &middot;{' '}
                    {content.manifest.format.toUpperCase()}
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
                    {content.manifestHash}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleModeSwitch('generator')}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" aria-hidden />
                Switch to Manifest Generator instead
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'generator' && !generatorOpen && !hasManifest && (
        <div className="flex flex-col items-center gap-3 py-10 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600">
          <Wand2 className="w-10 h-10 text-blue-600/60" aria-hidden />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Open the generator to build your manifest
          </p>
          <button
            type="button"
            onClick={handleOpenGenerator}
            disabled={generatorLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
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

      {mode === 'generator' && hasManifest && content?.manifest && content?.manifestHash && (
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
            <FileJson className="w-10 h-10 text-blue-600/70" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                {content.manifest.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(content.manifest.fileSize)} &middot; JSON &middot;{' '}
                <span className="text-blue-600">Generated</span>
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
                {content.manifestHash}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenGenerator}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" aria-hidden />
              Re-open Generator
            </button>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <FolderUp className="w-3.5 h-3.5" aria-hidden />
              Switch to file upload
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <ManifestGeneratorModal
        open={generatorOpen}
        useCase={selectedUseCase}
        onClose={handleGeneratorClose}
        onGenerated={handleGenerated}
      />
    </div>
  );
}
