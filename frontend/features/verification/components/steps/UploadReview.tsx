'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Edit2,
  FileJson,
  ShieldCheck,
  Hash,
  FileText,
  Send,
  Loader2,
  Upload,
} from 'lucide-react';
import { useWizardStore } from '../../store/wizard.store';
import { isValidSHA256 } from '@/utils/crypto';

export interface UploadReviewProps {
  onNavigate?: (step: number) => void;
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
}

function SectionHeader({
  icon,
  title,
  stepIndex,
  onNavigate,
}: {
  icon: React.ReactNode;
  title: string;
  stepIndex?: number;
  onNavigate?: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
      </div>
      {stepIndex !== undefined && onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate(stepIndex)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono,
  missing,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  missing?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span
        className={`text-xs break-all ${
          mono ? 'font-mono' : ''
        } ${
          missing ? 'text-gray-400 italic' : 'text-gray-800 dark:text-gray-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function UploadReview({ onNavigate, onSubmit, isSubmitting = false }: UploadReviewProps) {
  const { formData } = useWizardStore();
  const content = formData.content;
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const modeName = content?.encryptionEnabled ? 'SPV (Encrypted)' : 'Standard';
  const contentHashValid = isValidSHA256(content?.contentHash ?? '');
  const hasManifest = content?.manifest !== null && content?.manifest !== undefined;

  const canSubmit = contentHashValid && confirmed && !isSubmitting && !submitted;

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
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Upload className="w-4 h-4" />} title="Uploaded File" stepIndex={0} onNavigate={onNavigate} />
        {content?.file ? (
          <FieldRow label="File" value={`${content.file.name} (${(content.file.size / 1024).toFixed(1)} KB)`} />
        ) : (
          <p className="text-xs text-gray-400 italic">No file uploaded.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4">
        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Verification Mode" />
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            content?.encryptionEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {content?.encryptionEnabled && <ShieldCheck className="w-3 h-3" />}
          {modeName}
        </span>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Hash className="w-4 h-4" />} title="Content Hash" stepIndex={0} onNavigate={onNavigate} />
        {contentHashValid ? (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
              {content?.contentHash}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700">Valid hash required.</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<FileJson className="w-4 h-4" />} title="Manifest" stepIndex={1} onNavigate={onNavigate} />
        {hasManifest && content?.manifestHash ? (
          <FieldRow label="Manifest Hash" value={content.manifestHash} mono />
        ) : (
          <p className="text-xs text-gray-400 italic">No manifest attached.</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={isSubmitting || submitted}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            I confirm that the information above is correct and I authorise the submission to the Stellar network.
          </span>
        </label>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
            canSubmit
              ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
          ) : submitted ? (
            <><CheckCircle2 className="w-4 h-4" /> Submitted</>
          ) : (
            <><Send className="w-4 h-4" /> Submit Record</>
          )}
        </button>
      </div>
    </div>
  );
}
