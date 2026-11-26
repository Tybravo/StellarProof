'use client';

import React, { useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  Edit2,
  FileJson,
  ShieldCheck,
  Hash,
  FileText,
  Loader2,
  RotateCcw,
  ExternalLink,
  Check,
  HardDrive,
  Lock,
  Globe,
} from 'lucide-react';
import { useWizardStore, SubmissionResult } from '../../store/wizard.store';
import { isValidSHA256 } from '@/utils/crypto';
import CopyToClipboard from '@/components/ui/CopyToClipboard';
import ReadyToMint from '../ReadyToMint';

interface ReviewSubmitStepProps {
  onNavigate?: (step: number) => void;
}

// --- HELPER COMPONENTS ---

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

function OverlaySpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm mx-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-gray-200 dark:border-gray-700" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
          <div className="absolute inset-2 w-16 h-16 rounded-full border-4 border-transparent border-t-green-500 animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Processing Transaction
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please wait while we submit your verification request to the Stellar network.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Confirm the transaction in your Freighter wallet when prompted.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Waiting for blockchain confirmation...</span>
        </div>
      </div>
    </div>
  );
}

function SuccessState({ result, onReset }: { result: SubmissionResult; onReset: () => void; }) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      <div className="flex flex-col items-center text-center space-y-4 py-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Verification Submitted Successfully!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
            Your verification request has been submitted to the Stellar network. 
            You can track the status using the details below.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Transaction Details</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Request ID</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{result.requestId}</p>
            </div>
            <CopyToClipboard value={result.requestId} label="request ID" className="ml-2" />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transaction Hash</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{result.txHash}</p>
            </div>
            <CopyToClipboard value={result.txHash} label="transaction hash" className="ml-2" />
          </div>

          {result.certificateId && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Certificate ID</p>
                <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{result.certificateId}</p>
              </div>
            <CopyToClipboard value={result.certificateId} label="certificate ID" className="ml-2" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`https://testnet.steexp.com/tx/${result.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View on Explorer
        </a>
        <button
          type="button"
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Start New Verification
        </button>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function ReviewSubmitStep({ onNavigate }: ReviewSubmitStepProps) {
  const { formData, isSubmitting, submissionResult, resetWizard } = useWizardStore();

  const content = formData.content;
  const isEncrypted = content?.encryptionEnabled ?? true;
  const contentHashValid = isValidSHA256(content?.contentHash ?? '');
  const hasManifest = content?.manifest !== null && content?.manifest !== undefined;
  const file = content?.file;

  // Generate thumbnail URL for images with safe Blob check
  const thumbnailPreview = useMemo(() => {
    if (file && file instanceof Blob && file.type?.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  }, [file]);

  // Utility to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const handleReset = useCallback(() => {
    resetWizard();
  }, [resetWizard]);

  if (submissionResult) return <SuccessState result={submissionResult} onReset={handleReset} />;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      
      {/* Media Summary Card */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
           <SectionHeader icon={<HardDrive className="w-4 h-4" />} title="Media Payload" stepIndex={0} onNavigate={onNavigate} />
        </div>
        <div className="flex items-start gap-4 p-4">
          {thumbnailPreview ? (
            <img 
              src={thumbnailPreview} 
              alt="Upload preview" 
              className="h-24 w-24 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{file?.name || 'No file selected'}</span>
            <span className="text-sm text-gray-500">{file ? formatBytes(file.size) : '--'}</span>
            <span className="inline-block mt-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 w-max">
              {file?.type || 'Unknown format'}
            </span>
          </div>
        </div>
      </div>

      {/* Manifest & SPV Privacy Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Manifest Details */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 shadow-sm space-y-3">
          <SectionHeader icon={<FileJson className="w-4 h-4" />} title="Manifest Details" stepIndex={1} onNavigate={onNavigate} />
          {hasManifest && content?.manifestHash ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-gray-500">Hash</span>
                <span className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate" title={content.manifestHash}>
                  {content.manifestHash}
                </span>
              </div>
              <CopyToClipboard value={content.manifestHash} label="manifest hash" />
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No additional manifest metadata provided.</p>
          )}
        </div>

        {/* Privacy Options */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 shadow-sm">
          <SectionHeader icon={<ShieldCheck className="w-4 h-4" />} title="Privacy Configuration" stepIndex={2} onNavigate={onNavigate} />
          <div className="flex items-start gap-3 mt-2">
            <div className={`mt-0.5 rounded-full p-1.5 ${isEncrypted ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {isEncrypted ? (
                <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isEncrypted ? 'KMS Encrypted' : 'Public Ledger'}
              </span>
              <span className="text-xs text-gray-500 mt-0.5">
                {isEncrypted ? 'Payload secured before broadcasting.' : 'Data stored plainly for transparency.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Hash Status */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-3">
        <SectionHeader icon={<Hash className="w-4 h-4" />} title="Content Hash Validation" />
        {contentHashValid ? (
          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <p className="text-xs font-mono break-all text-green-800 dark:text-green-200">
              {content?.contentHash}
            </p>
            <CopyToClipboard value={content?.contentHash ?? ''} label="content hash" />
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-400">Valid SHA-256 hash required before submission.</p>
          </div>
        )}
      </div>

      <ReadyToMint
        contentHash={content?.contentHash ?? ''}
        manifestHash={content?.manifestHash ?? null}
        isReady={contentHashValid}
      />

      {isSubmitting && !showSignPrompt && <OverlaySpinner />}
      <SignPromptModal open={showSignPrompt} onClose={() => setShowSignPrompt(false)} />
    </div>
  );
}