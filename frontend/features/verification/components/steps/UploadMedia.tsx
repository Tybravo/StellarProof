'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileImage, FileText, X, Loader2, CheckCircle2 } from 'lucide-react';
import { hashFile } from '@/utils/hashing';
import { useWizardStore } from '../../store/wizard.store';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'],
  'application/pdf': ['.pdf'],
  'application/json': ['.json'],
  'application/xml': ['.xml'],
  'text/*': ['.txt', '.csv', '.md'],
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function UploadMedia() {
  const { formData, setUploadFile, setContentHash, setHashProgress, setIsHashing, setStepValid } = useWizardStore();

  const content = formData.content;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setContentHash(null);
      setHashProgress(0);

      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      } else {
        setPreviewUrl(null);
      }

      setUploadFile({
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: preview,
      });

      setIsHashing(true);
      try {
        const hash = await hashFile(file, (percent) => setHashProgress(percent));
        setContentHash(hash);
        setStepValid(0, true);
      } catch {
        setError('Failed to compute file hash. Please try again.');
        setContentHash(null);
        setStepValid(0, false);
      } finally {
        setIsHashing(false);
      }
    },
    [setUploadFile, setContentHash, setHashProgress, setIsHashing, setStepValid],
  );

  const handleReset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadFile(null);
    setContentHash(null);
    setHashProgress(0);
    setIsHashing(false);
    setError(null);
    setStepValid(0, false);
  }, [previewUrl, setUploadFile, setContentHash, setHashProgress, setIsHashing, setStepValid]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) handleFile(accepted[0]);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
  });

  const hasFile = content?.file !== null && content?.file !== undefined;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {!hasFile && (
        <div
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDragActive
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-blue-600" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDragActive ? 'Drop your file here…' : 'Drag & drop a file, or click to browse'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Images, PDFs, JSON, XML, text files supported
          </p>
        </div>
      )}

      {hasFile && content?.file && (
        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
          <button
            type="button"
            onClick={handleReset}
            aria-label="Remove file"
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>

          <div className="flex items-center gap-4">
            {previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewUrl}
                alt={content.file.name}
                className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />
            ) : content.file.type.startsWith('image/') ? (
              <FileImage className="w-12 h-12 text-blue-600/70" />
            ) : (
              <FileText className="w-12 h-12 text-blue-600/70" />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                {content.file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(content.file.size)} &middot; {content.file.type || 'unknown'}
              </p>
            </div>
          </div>

          {content.isHashing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Computing SHA-256 hash… {content.hashProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${content.hashProgress}%` }}
                />
              </div>
            </div>
          )}

          {content.contentHash && !content.isHashing && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium text-green-700 dark:text-green-300">
                  SHA-256 Hash
                </p>
                <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
                  {content.contentHash}
                </p>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
