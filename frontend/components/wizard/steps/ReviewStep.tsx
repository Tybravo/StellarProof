"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Edit2,
  FileJson,
  ShieldCheck,
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
/* Types                                  */
/* ------------------------------------------------------------------ */

export interface ReviewStepProps {
  onNavigate?: (step: number) => void;
  onSubmit?: () => void | Promise<void>;
  walletAddress?: string;
  network?: string;
  isSubmitting?: boolean;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  stepIndex?: number;
  onNavigate?: (step: number) => void;
}

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  missing?: boolean;
}

/* ------------------------------------------------------------------ */
/* Helpers                                   */
/* ------------------------------------------------------------------ */

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-10)}`;
}

/* ------------------------------------------------------------------ */
/* Sub-components                               */
/* ------------------------------------------------------------------ */

// Fixed: Added SectionHeaderProps type to replace 'any'
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
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}

// Fixed: Added FieldRowProps type to replace 'any'
function FieldRow({ label, value, mono, missing }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-xs break-all ${
          mono ? "font-mono" : ""
        } ${
          missing
            ? "text-gray-400 italic"
            : "text-gray-800 dark:text-gray-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Component                              */
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

  const isAdvancedMode = Boolean(state.advancedContentHash);
  const activeContentHash = state.contentHash ?? state.advancedContentHash;
  const activeManifestHash = state.manifestHash ?? state.advancedManifestHash;

  const modeName = isAdvancedMode
    ? "Advanced"
    : state.encryptionEnabled
    ? "SPV (Encrypted)"
    : "Standard";

  const contentHashValid = isValidSHA256(activeContentHash || "");
  const hasManifest = Boolean(state.manifest);

  const canSubmit =
    contentHashValid && confirmed && !isSubmitting && !submitted;

  const STEP_CONTENT = 0;
  const STEP_MANIFEST = 1;

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      await onSubmit?.();
      setSubmitted(true);
    } catch {
      setSubmitted(false);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Wallet & Network */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Wallet className="w-4 h-4" />} title="Wallet & Network" />
        <div className="grid grid-cols-2 gap-3">
          <FieldRow
            label="Wallet Address"
            value={walletAddress ? truncateHash(walletAddress) : "Not connected"}
            mono={!!walletAddress}
            missing={!walletAddress}
          />
          <FieldRow
            label="Network"
            value={<span className="inline-flex items-center gap-1"><Globe className="w-3 h-3 text-primary" />{network}</span>}
          />
        </div>
      </div>

      {/* Mode */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4">
        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Verification Mode" stepIndex={STEP_CONTENT} onNavigate={onNavigate} />
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isAdvancedMode ? "bg-purple-100 text-purple-700" : state.encryptionEnabled ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
          {state.encryptionEnabled && !isAdvancedMode && <ShieldCheck className="w-3 h-3" />}
          {modeName}
        </span>
      </div>

      {/* Content Hash */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Hash className="w-4 h-4" />} title="Content Hash" stepIndex={STEP_CONTENT} onNavigate={onNavigate} />
        {contentHashValid ? (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">{activeContentHash}</p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700">Valid hash required.</p>
          </div>
        )}
      </div>

      {/* Manifest */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<FileJson className="w-4 h-4" />} title="Manifest" stepIndex={STEP_MANIFEST} onNavigate={onNavigate} />
        {hasManifest || activeManifestHash ? (
          <FieldRow label="Manifest Hash" value={activeManifestHash || "Attached"} mono />
        ) : (
          <p className="text-xs text-gray-400 italic">No manifest attached.</p>
        )}
      </div>

      {/* Confirmation & Submit */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={isSubmitting || submitted}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-primary cursor-pointer"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            I confirm that the information above is correct and I authorise the submission to the Stellar network.
          </span>
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${canSubmit ? "bg-primary text-white shadow-lg active:scale-95" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
        >
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : submitted ? <><CheckCircle2 className="w-4 h-4" /> Submitted</> : <><Send className="w-4 h-4" /> Submit Record</>}
        </button>
      </div>
    </div>
  );
}