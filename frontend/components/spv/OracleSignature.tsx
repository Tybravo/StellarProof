'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface OracleSignatureProps {
  signatureHex: string;
}

export default function OracleSignature({ signatureHex }: OracleSignatureProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(signatureHex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <section aria-labelledby="oracle-signature-heading" className="border-y border-gray-200 py-4 dark:border-gray-800">
      <div className="flex items-center justify-between gap-4">
        <h2 id="oracle-signature-heading" className="text-sm font-semibold text-gray-900 dark:text-white">
          Oracle signature
        </h2>
        <button
          type="button"
          onClick={copy}
          className="grid h-9 w-9 place-items-center text-gray-500 hover:text-gray-950 dark:hover:text-white"
          aria-label="Copy Oracle signature"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <code className="mt-2 block break-all font-mono text-xs leading-5 text-gray-700 dark:text-gray-300">
        {signatureHex}
      </code>
      <span className="sr-only" aria-live="polite">{copied ? 'Signature copied' : ''}</span>
    </section>
  );
}
