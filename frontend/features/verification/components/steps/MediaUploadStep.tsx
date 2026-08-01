'use client';

import React, { useCallback, useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileImage, FileVideo, FileText, X, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
export interface MediaFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export interface MediaUploadStepProps {
  /** Max file size in bytes (default: 50 MB) */
  maxSize?: number;
  /** Accepted MIME types (default: images, videos, PDFs) */
  accept?: Record<string, string[]>;
  /** Allow multiple files (default: false) */
  multiple?: boolean;
  /** Called when files change */
  onFilesChange?: (files: MediaFile[]) => void;
  /** External files to display (controlled mode) */
  files?: MediaFile[];
  /** Custom label text */
  label?: string;
  /** Custom hint text */
  hint?: string;
}

const DEFAULT_ACCEPT: Record<string, string[]> = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.heic'],
  'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'],
  'application/pdf': ['.pdf'],
};

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

// ── Helpers ────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function generateId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  return FileText;
}

function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType === 'application/pdf') return 'PDF';
  return 'Document';
}

// ── Component ──────────────────────────────────────────────
export default function MediaUploadStep({
  maxSize = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  multiple = false,
  onFilesChange,
  files: externalFiles,
  label = 'Drag & drop files here, or click to browse',
  hint = 'Supported: images, videos, PDFs (up to 50 MB each)',
}: MediaUploadStepProps) {
  const [internalFiles, setInternalFiles] = useState<MediaFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Use external files if controlled mode
  const files = externalFiles ?? internalFiles;
  const setFiles = useCallback(
    (newFiles: MediaFile[] | ((prev: MediaFile[]) => MediaFile[])) => {
      if (externalFiles !== undefined) {
        // Controlled mode — call callback
        const updated = typeof newFiles === 'function' ? newFiles(externalFiles) : newFiles;
        onFilesChange?.(updated);
      } else {
        setInternalFiles(newFiles);
        if (typeof newFiles !== 'function') {
          onFilesChange?.(newFiles);
        }
      }
    },
    [externalFiles, onFilesChange],
  );

  // ── File Processing ───────────────────────────────────
  const processFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(fileList);

      if (incoming.length === 0) return;

      // Validate each file
      const validFiles: File[] = [];
      for (const file of incoming) {
        if (file.size > maxSize) {
          setError(`"${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
          continue;
        }
        if (file.size === 0) {
          setError(`"${file.name}" is empty`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      // Create media file entries with previews
      const newEntries: MediaFile[] = validFiles.map((file) => ({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/')
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
        status: 'pending' as const,
      }));

      // Add files — if not multiple, replace
      if (!multiple) {
        // Revoke old preview URLs
        files.forEach((f) => {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        });
        setFiles(newEntries.slice(0, 1));
      } else {
        setFiles((prev) => [...prev, ...newEntries]);
      }

      // Simulate upload progress (in real app this would be actual upload)
      for (const entry of newEntries) {
        await simulateUpload(entry.id);
      }
    },
    [maxSize, multiple, files, setFiles],
  );

  const simulateUpload = async (fileId: string) => {
    const updateProgress = (progress: number) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, progress, status: progress >= 100 ? 'done' : 'uploading' }
            : f,
        ),
      );
    };

    for (let p = 0; p <= 100; p += 20) {
      await new Promise((r) => setTimeout(r, 150));
      updateProgress(p);
    }
    updateProgress(100);
  };

  // ── Drag Handlers ─────────────────────────────────────
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set inactive if leaving the drop zone (not entering a child)
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  // ── Click Handler ─────────────────────────────────────
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        // Reset input so the same file can be re-selected
        e.target.value = '';
      }
    },
    [processFiles],
  );

  // ── Remove File ───────────────────────────────────────
  const handleRemove = useCallback(
    (fileId: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
        return prev.filter((f) => f.id !== fileId);
      });
    },
    [setFiles],
  );

  // ── Keyboard Handler ──────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  // ── Render ────────────────────────────────────────────
  const hasFiles = files.length > 0;
  const showDropZone = multiple || !hasFiles;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4" data-testid="media-upload-step">
      {/* Drop Zone */}
      {showDropZone && (
        <div
          ref={dropZoneRef}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          aria-label="Upload media files"
          data-testid="drop-zone"
          className={`
            relative flex flex-col items-center justify-center gap-3 p-10
            rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-200 select-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-[1.01] shadow-lg shadow-blue-500/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            onChange={handleInputChange}
            multiple={multiple}
            accept={Object.keys(accept).join(',')}
            className="hidden"
            aria-hidden="true"
            data-testid="file-input"
          />

          <div
            className={`
              p-4 rounded-full transition-colors
              ${dragActive ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-800'}
            `}
          >
            <Upload
              className={`w-10 h-10 transition-colors ${
                dragActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
              }`}
            />
          </div>

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
            {dragActive ? 'Drop files here…' : label}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{hint}</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
          data-testid="error-banner"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3" data-testid="file-list" role="list" aria-label="Uploaded files">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            return (
              <div
                key={file.id}
                role="listitem"
                data-testid={`file-item-${file.id}`}
                className={`
                  relative rounded-xl border p-4 transition-all
                  ${
                    file.status === 'error'
                      ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60'
                  }
                `}
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(file.id)}
                  aria-label={`Remove ${file.name}`}
                  data-testid={`remove-${file.id}`}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition z-10"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>

                <div className="flex items-start gap-4 min-w-0">
                  {/* Preview Thumbnail */}
                  {file.previewUrl ? (
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                      {isImage ? (
                        <img
                          src={file.previewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isVideo ? (
                        <video
                          src={file.previewUrl}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : null}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        {getFileCategory(file.type)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                          <span>Uploading… {file.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                            role="progressbar"
                            aria-valuenow={file.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                      </div>
                    )}

                    {/* Done Badge */}
                    {file.status === 'done' && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Upload complete</span>
                      </div>
                    )}

                    {/* Error Message */}
                    {file.status === 'error' && file.error && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400">{file.error}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!hasFiles && !showDropZone && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No files selected</p>
        </div>
      )}
    </div>
  );
}
