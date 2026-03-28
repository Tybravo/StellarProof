'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { XMLBuilder } from 'fast-xml-parser';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css'; 
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markup'; 
import { FormatToggle, ManifestFormat } from './FormatToggle';
import { ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ManifestData {
  manifest_info: {
    version: string;
    network: string;
    timestamp: string;
  };
  proof_details: {
    issuer: string;
    asset_code: string;
    amount: string;
    verification_hash: string;
  };
  metadata: {
    domain: string;
    memo?: string;
  };
}

export const ManifestPreview = ({ manifestData }: { manifestData: ManifestData }) => {
  const [format, setFormat] = useState<ManifestFormat>('json');
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLPreElement>(null);

  // 1. Resolve Hydration & Linter Error
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const { formattedOutput, error } = useMemo(() => {
    if (!manifestData || Object.keys(manifestData).length === 0) {
      return { 
        formattedOutput: '', 
        error: "No manifest data provided. Fill the form to see a preview." 
      };
    }
    
    try {
      if (format === 'json') {
        return { 
          formattedOutput: JSON.stringify(manifestData, null, 2), 
          error: null 
        };
      }
      
      const builder = new XMLBuilder({ format: true, ignoreAttributes: false, suppressEmptyNode: true });
      return { 
        formattedOutput: builder.build({ Manifest: manifestData }), 
        error: null 
      };
    } catch {
      return { 
        formattedOutput: '', 
        error: `Serialization Error: Unable to generate valid ${format.toUpperCase()}.` 
      };
    }
  }, [manifestData, format]);

  useEffect(() => {
    if (mounted && !error) {
      Prism.highlightAll();
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [formattedOutput, format, error, mounted]);

  const handleCopy = async () => {
    if (error) return;
    await navigator.clipboard.writeText(formattedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  const langClass = format === 'json' ? 'language-json' : 'language-markup';

  return (
    <div className="flex flex-col h-[500px] bg-[#0d1117] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="flex justify-between items-center p-3 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5 px-2">
             <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
             <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
             <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
           </div>
           {/* Sharp Technical Typography */}
           <span className="text-[10px] font-mono text-gray-400 font-bold tracking-[0.25em] uppercase leading-none">
             preview.{format}
           </span>
        </div>
        <div className="flex items-center gap-3">
          <FormatToggle currentFormat={format} onFormatChange={setFormat} />
          <button 
            onClick={handleCopy}
            disabled={!!error}
            className={`p-1.5 rounded-md transition-all active:scale-95 ${
              error ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden flex font-mono text-[13px]">
        {error ? (
          <div className="flex flex-col items-center justify-center w-full h-full p-8 text-center bg-[#0d1117]">
             <ExclamationTriangleIcon className="w-10 h-10 text-amber-500 mb-3 opacity-80" />
             <h3 className="text-gray-200 font-semibold">Preview Unavailable</h3>
          </div>
        ) : (
          <>
            <div className="py-4 px-3 text-right bg-[#0d1117] border-r border-gray-800 select-none text-gray-600 min-w-[3.5rem]">
              {formattedOutput.split('\n').map((_, i) => (
                <div key={i} className="leading-relaxed">{i + 1}</div>
              ))}
            </div>

            <pre 
              ref={scrollRef}
              className={`flex-1 p-4 m-0 overflow-auto custom-scrollbar ${langClass}`}
              style={{ backgroundColor: 'transparent' }}
            >
              <code className={`${langClass} leading-relaxed`}>
                {formattedOutput}
              </code>
            </pre>
          </>
        )}
      </div>
    </div>
  );
};