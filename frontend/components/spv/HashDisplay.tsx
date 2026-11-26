'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface HashDisplayProps {
  contentHashHex: string;
  manifestHashHex: string;
}

function HashRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <div className="border-b border-gray-200 py-4 last:border-0 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="grid h-8 w-8 place-items-center text-gray-500 hover:text-gray-950 dark:hover:text-white"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <code className="block break-all font-mono text-sm leading-6 text-gray-900 dark:text-gray-100">
        {value}
      </code>
    </div>
  );
}

export default function HashDisplay({ contentHashHex, manifestHashHex }: HashDisplayProps) {
  return (
    <section aria-labelledby="spv-hashes-heading" className="border-y border-gray-200 dark:border-gray-800">
      <h2 id="spv-hashes-heading" className="sr-only">SPV cryptographic hashes</h2>
      <HashRow label="Content hash" value={contentHashHex} />
      <HashRow label="Manifest hash" value={manifestHashHex} />
    </section>
  );
}
