"use client";

import React from "react";

export interface DecryptionRequestModalProps {
  open: boolean;
  assetName: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks the user to confirm before the parent calls the decryption API. */
export default function DecryptionRequestModal({
  open,
  assetName,
  loading = false,
  error = null,
  onConfirm,
  onClose,
}: DecryptionRequestModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decrypt-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
      >
        <h2 id="decrypt-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Request decryption
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Confirm to request the KMS key and decrypt <span className="font-medium">{assetName}</span> in this browser.
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Requesting…" : "Confirm decryption"}
          </button>
        </div>
      </div>
    </div>
  );
}
