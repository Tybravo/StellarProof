"use client";

import React, { useCallback, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { rotateKmsKey, type RotateKeyResult } from "@/services/kmsService";
import { cn } from "@/utils/cn";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../ui/Modal";

export interface RotateKeyButtonProps {
  /** Owner / user identifier (e.g. user ID or Stellar public key) for KMS rotation. */
  userId?: string;
  /** Optional asset or storage ID when triggered in the context of a specific SPV asset. */
  assetId?: string;
  /** Current active key version label (e.g. "v1") to display in the modal. */
  currentKeyVersion?: string;
  /** Optional custom rotation handler (defaults to `rotateKmsKey`). */
  onRotate?: (params: {
    userId: string;
    assetId?: string;
  }) => Promise<RotateKeyResult>;
  /** Optional callback invoked after a successful key rotation. */
  onRotated?: (result: RotateKeyResult) => void;
  /** Disables the trigger button externally. */
  disabled?: boolean;
  /** Optional extra classes for the trigger button. */
  className?: string;
}

/**
 * Admin / asset-owner action button with a confirmation modal for rotating
 * the active KMS encryption key protecting SPV vault assets.
 */
export function RotateKeyButton({
  userId,
  assetId,
  currentKeyVersion,
  onRotate,
  onRotated,
  disabled = false,
  className,
}: RotateKeyButtonProps) {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RotateKeyResult | null>(null);

  const effectiveUserId = userId?.trim() ?? "";

  const handleOpen = useCallback(() => {
    setError(null);
    setResult(null);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (isRotating) return;
    setIsOpen(false);
    setError(null);
    setResult(null);
  }, [isRotating]);

  const handleConfirmRotation = async () => {
    if (!effectiveUserId) {
      const msg = "Connect your account or provide an owner ID to rotate keys.";
      setError(msg);
      addToast({ type: "error", message: msg });
      return;
    }

    setIsRotating(true);
    setError(null);

    try {
      const rotationResult = onRotate
        ? await onRotate({ userId: effectiveUserId, assetId })
        : await rotateKmsKey(effectiveUserId, { assetId });

      setResult(rotationResult);
      const summary = `KMS key rotated (${rotationResult.oldKeyVersion} → ${rotationResult.newKeyVersion}, ${rotationResult.assetsReEncrypted} asset${rotationResult.assetsReEncrypted === 1 ? "" : "s"} re-encrypted).`;
      addToast({ type: "success", message: summary });
      onRotated?.(rotationResult);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to rotate KMS key. Please try again.";
      setError(message);
      addToast({ type: "error", message });
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled || isRotating}
        aria-label="Rotate Key"
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
          "border border-amber-300/60 dark:border-amber-500/30",
          "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
          "hover:bg-amber-100 dark:hover:bg-amber-500/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
      >
        {isRotating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>Rotate Key</span>
      </button>

      <Modal open={isOpen} onClose={handleClose} size="sm">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              {result ? (
                <CheckCircle2
                  className="w-5 h-5 text-green-400"
                  aria-hidden="true"
                />
              ) : (
                <KeyRound
                  className="w-5 h-5 text-amber-400"
                  aria-hidden="true"
                />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {result ? "KMS Key Rotated" : "Confirm KMS Key Rotation"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                SPV Vault Encryption Administration
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {result ? (
            <div
              role="status"
              className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2"
            >
              <p className="text-sm font-semibold text-green-300">
                Key rotation completed successfully.
              </p>
              <dl className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-300">
                <dt className="text-gray-400">Previous Version</dt>
                <dd className="font-mono text-right">{result.oldKeyVersion}</dd>
                <dt className="text-gray-400">Active Version</dt>
                <dd className="font-mono text-right text-green-300 font-semibold">
                  {result.newKeyVersion}
                </dd>
                <dt className="text-gray-400">Assets Re-encrypted</dt>
                <dd className="font-mono text-right">
                  {result.assetsReEncrypted}
                </dd>
              </dl>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
                <ShieldAlert
                  className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <p>
                  Rotating your KMS key generates a new active AES-256-GCM key
                  version, retires the current key, and atomically re-encrypts
                  all active SPV assets.
                </p>
              </div>

              <dl className="space-y-1.5 text-xs text-gray-300 bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-gray-400">Owner ID</dt>
                  <dd className="font-mono truncate max-w-[200px]">
                    {effectiveUserId || "Not connected"}
                  </dd>
                </div>
                {assetId && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-gray-400">Asset Reference</dt>
                    <dd className="font-mono truncate max-w-[200px]">
                      {assetId}
                    </dd>
                  </div>
                )}
                {currentKeyVersion && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-gray-400">Current Key Version</dt>
                    <dd className="font-mono">{currentKeyVersion}</dd>
                  </div>
                )}
              </dl>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
                >
                  <AlertCircle
                    className="w-4 h-4 text-red-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          {result ? (
            <button
              type="button"
              onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isRotating}
                className="px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRotation}
                disabled={isRotating}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRotating && (
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                <span>{isRotating ? "Rotating Key..." : "Confirm Rotation"}</span>
              </button>
            </>
          )}
        </ModalFooter>
      </Modal>
    </>
  );
}

export default RotateKeyButton;
