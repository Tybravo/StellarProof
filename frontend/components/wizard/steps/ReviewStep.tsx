/**
 * Review Step
 * Final wizard step showing a summary of all entered data before submission.
 * Displays mode, content hash, manifest, SPV details, wallet/network info,
 * a confirmation checkbox, and a gated submit button.
 *
 * @see Issue #review – Frontend: ReviewStep UI
 */
"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Edit2,
  FileJson,
  FileCode2,
  ShieldCheck,
  ShieldOff,
  Wallet,
  Globe,
  Hash,
  FileText,
  Send,
  Loader2,
} from "lucide-react";
import { useWizard } from "../../../context/WizardContext";
import { isValidSHA256 } from "../../../utils/crypto";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

export interface ReviewStepProps {
  /** Navigate to a specific wizard step index for editing */
  onNavigate?: (step: number) => void;
  /** Called when the user submits the final form */
  onSubmit?: () => void | Promise<void>;
  /** Connected wallet address */
  walletAddress?: string;
  /** Active network (e.g. "Testnet", "Mainnet") */
  network?: string;
  /** Whether a submission is in progress */
  isSubmitting?: boolean;
}

/* ------------------------------------------------------------------ */
/*                           Helpers                                   */
/* ------------------------------------------------------------------ */

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-10)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*                        Sub-components                               */
/* ------------------------------------------------------------------ */

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  stepIndex?: number;
  onNavigate?: (step: number) => void;
}

function SectionHeader({ icon, title, stepIndex, onNavigate }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {title}
        </h3>
      </div>
      {stepIndex !== undefined && onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(stepIndex)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors"
          aria-label={`Edit ${title}`}
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  missing?: boolean;
}

function FieldRow({ label, value, mono, missing }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-xs break-all ${
          mono ? "font-mono" : ""
        } ${
          missing
            ? "text-gray-400 dark:text-gray-600 italic"
            : "text-gray-800 dark:text-gray-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Main Component                              */
/* ------------------------------------------------------------------ */

export default function ReviewStep({
  onNavigate,
  onSubmit,
  walletAddress,
  network = "Testnet",
  isSubmitting = false,
}: ReviewStepProps) {
  const { state } = useWizard();
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* Derive display values */
  const isAdvancedMode = Boolean(state.advancedContentHash);
  const activeContentHash = state.contentHash ?? state.advancedContentHash;
  const activeManifestHash = state.manifestHash ?? state.advancedManifestHash;

  const modeName = isAdvancedMode
    ? "Advanced"
    : state.encryptionEnabled
    ? "SPV (Encrypted)"
    : "Standard";

  const contentHashValid = isValidSHA256(activeContentHash);
  const hasManifest = Boolean(state.manifest);
  const hasFile = Boolean(state.file);

  /* A submission is valid when we have a content hash and user confirmed */
  const canSubmit =
    contentHashValid && confirmed && !isSubmitting && !submitted;

  /* Step indices for edit navigation (matches typical wizard step order) */
  const STEP_CONTENT = 0;   // MediaInput or AdvancedInput
  const STEP_MANIFEST = 1;  // ManifestStep
  const STEP_SPV = 2;       // SPVOptions

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
    await onSubmit?.();
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">

      {/* ── Wallet & Network ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Wallet className="w-4 h-4" />} title="Wallet & Network" />
        <div className="grid grid-cols-2 gap-3">
          <FieldRow
            label="Wallet Address"
            value={
              walletAddress
                ? truncateHash(walletAddress)
                : "Not connected"
            }
            mono={Boolean(walletAddress)}
            missing={!walletAddress}
          />
          <FieldRow
            label="Network"
            value={
              <span className="inline-flex items-center gap-1">
                <Globe className="w-3 h-3 text-primary" />
                {network}
              </span>
            }
          />
        </div>
      </div>

      {/* ── Mode ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4">
        <SectionHeader
          icon={<FileText className="w-4 h-4" />}
          title="Verification Mode"
          stepIndex={STEP_CONTENT}
          onNavigate={onNavigate}
        />
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
              ${
                isAdvancedMode
                  ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                  : state.encryptionEnabled
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                  : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
              }
            `}
          >
            {state.encryptionEnabled && !isAdvancedMode ? (
              <ShieldCheck className="w-3 h-3" />
            ) : null}
            {modeName}
          </span>
        </div>
      </div>

      {/* ── Content Hash ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader
          icon={<Hash className="w-4 h-4" />}
          title="Content Hash"
          stepIndex={STEP_CONTENT}
          onNavigate={onNavigate}
        />

        {contentHashValid ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="min-w-0 space-y-1 flex-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                SHA-256 · {isAdvancedMode ? "Manual entry" : hasFile ? state.file!.name : "Hash"}
              </p>
              <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
                {activeContentHash}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-300">
              No valid content hash. Go back to add a file or enter a hash.
            </p>
          </div>
        )}

        {hasFile && state.file && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <FieldRow label="File Name" value={state.file.name} />
            <FieldRow label="File Size" value={formatFileSize(state.file.size)} />
            <FieldRow label="MIME Type" value={state.file.type || "—"} />
          </div>
        )}
      </div>

      {/* ── Manifest ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader
          icon={
            state.manifest?.format === "json" ? (
              <FileJson className="w-4 h-4" />
            ) : (
              <FileCode2 className="w-4 h-4" />
            )
          }
          title="Manifest"
          stepIndex={STEP_MANIFEST}
          onNavigate={onNavigate}
        />

        {hasManifest && state.manifest ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="File Name" value={state.manifest.fileName} />
              <FieldRow label="Format" value={state.manifest.format.toUpperCase()} />
              <FieldRow label="File Size" value={formatFileSize(state.manifest.fileSize)} />
            </div>
            {activeManifestHash && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                <div className="min-w-0 space-y-1 flex-1">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">
                    Manifest SHA-256
                  </p>
                  <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
                    {activeManifestHash}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : activeManifestHash ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="min-w-0 space-y-1 flex-1">
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                Manifest SHA-256 (manual)
              </p>
              <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
                {activeManifestHash}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-600 italic">
            No manifest attached — optional.
          </p>
        )}
      </div>

      {/* ── SPV Details ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader
          icon={<ShieldCheck className="w-4 h-4" />}
          title="SPV Details"
          stepIndex={STEP_SPV}
          onNavigate={onNavigate}
        />

        <div className="flex items-center gap-2">
          {state.encryptionEnabled ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 w-full">
              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-300">
                  Client-Side Encryption Enabled
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Hash will be encrypted locally before storage.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 w-full">
              <ShieldOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <div>
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                  Encryption Disabled
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Hash will be stored in plaintext.
                </p>
              </div>
            </div>
          )}
        </div>

        {state.spvResult && (
          <div className="space-y-2 pt-1">
            <FieldRow
              label="Encrypted Hash"
              value={truncateHash(state.spvResult.encryptedHash)}
              mono
            />
            <FieldRow
              label="Storage ID"
              value={state.spvResult.storageId}
              mono
            />
          </div>
        )}
      </div>

      {/* ── Confirmation & Submit ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={isSubmitting || submitted}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 accent-primary cursor-pointer"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            I confirm that the information above is correct and I authorise the
            submission of this provenance record to the Stellar network.
          </span>
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`
            w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
            text-sm font-medium transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2
            focus:ring-offset-white dark:focus:ring-offset-gray-900
            ${
              canSubmit
                ? "bg-primary text-white hover:bg-primary-dark shadow-button-glow hover:shadow-button-glow active:scale-[0.98]"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            }
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting…
            </>
          ) : submitted ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Submitted
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Provenance Record
            </>
          )}
        </button>

        {!contentHashValid && (
          <p className="text-xs text-red-500 dark:text-red-400 text-center">
            A valid content hash is required before submitting.
          </p>
        )}
      </div>
    </div>
  );
}
