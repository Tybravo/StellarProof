"use client";

import React from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export type UploadProgressStatus = "idle" | "uploading" | "generating" | "success" | "error";

export interface UploadProgressProps {
  label: string;
  status: UploadProgressStatus;
  progress?: number;
  cid?: string;
  error?: string;
}

const BAR_COLORS: Record<Exclude<UploadProgressStatus, "idle">, string> = {
  uploading: "[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600",
  generating: "animate-pulse [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600",
  success: "[&::-webkit-progress-value]:bg-green-600 [&::-moz-progress-bar]:bg-green-600",
  error: "[&::-webkit-progress-value]:bg-red-600 [&::-moz-progress-bar]:bg-red-600",
};

function toPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.round(Math.min(100, Math.max(0, progress)));
}

export default function UploadProgress({
  label,
  status,
  progress = 0,
  cid,
  error,
}: UploadProgressProps) {
  if (status === "idle") return null;

  const percent = status === "generating" || status === "success" ? 100 : toPercent(progress);

  return (
    <div
      className="w-full space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60"
      data-testid="upload-progress"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate font-medium text-gray-800 dark:text-gray-200">{label}</span>
        {status === "uploading" && (
          <span className="shrink-0 text-gray-600 dark:text-gray-400">{percent}%</span>
        )}
      </div>

      <progress
        className={`block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 [&::-webkit-progress-bar]:bg-gray-200 dark:[&::-webkit-progress-bar]:bg-gray-700 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-300 [&::-moz-progress-bar]:rounded-full ${BAR_COLORS[status]}`}
        value={percent}
        max={100}
        aria-label={`${label} upload progress`}
      />

      <div aria-live="polite">
        {status === "uploading" && (
          <p className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            Uploading…
          </p>
        )}

        {status === "generating" && (
          <p className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            Generating CID…
          </p>
        )}

        {status === "success" && (
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              CID generated
            </p>
            {cid && (
              <code
                className="block break-all font-mono text-xs text-gray-700 dark:text-gray-300"
                data-testid="upload-progress-cid"
              >
                {cid}
              </code>
            )}
          </div>
        )}

        {status === "error" && (
          <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error ?? "Upload failed"}
          </p>
        )}
      </div>
    </div>
  );
}
