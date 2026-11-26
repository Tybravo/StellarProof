'use client';

import { useState } from 'react';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { verifySpvSignature } from '@/utils/verifySpvSignature';

export interface ManualVerifierProps {
  contentHashHex?: string;
  signatureHex?: string;
  publicKeyHex?: string;
}

type Result = 'valid' | 'invalid' | null;

export default function ManualVerifier({
  contentHashHex = '',
  signatureHex = '',
  publicKeyHex = '',
}: ManualVerifierProps) {
  const [contentHash, setContentHash] = useState(contentHashHex);
  const [signature, setSignature] = useState(signatureHex);
  const [publicKey, setPublicKey] = useState(publicKeyHex);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async () => {
    setIsVerifying(true);
    setError(null);
    setResult(null);
    try {
      setResult(
        (await verifySpvSignature({ contentHashHex: contentHash, signatureHex: signature, publicKeyHex: publicKey }))
          ? 'valid'
          : 'invalid'
      );
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Proof verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <section aria-labelledby="manual-verifier-heading" className="py-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue-600" aria-hidden="true" />
        <h2 id="manual-verifier-heading" className="text-base font-semibold text-gray-950 dark:text-white">
          Verify proof
        </h2>
      </div>

      <div className="grid gap-4">
        {[
          ['Content hash', contentHash, setContentHash],
          ['Oracle signature', signature, setSignature],
          ['Oracle public key', publicKey, setPublicKey],
        ].map(([label, value, setter]) => (
          <label key={label as string} className="grid gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            {label as string}
            <textarea
              value={value as string}
              onChange={(event) => (setter as (value: string) => void)(event.target.value)}
              rows={2}
              spellCheck={false}
              className="resize-none rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-950 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3" aria-live="polite">
        <button
          type="button"
          onClick={verify}
          disabled={isVerifying}
          className="h-10 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isVerifying ? 'Verifying…' : 'Verify signature'}
        </button>
        {result === 'valid' && (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" /> Valid proof
          </span>
        )}
        {result === 'invalid' && (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
            <XCircle className="h-5 w-5" /> Invalid proof
          </span>
        )}
        {error && <span className="text-sm text-red-700 dark:text-red-400">{error}</span>}
      </div>
    </section>
  );
}
