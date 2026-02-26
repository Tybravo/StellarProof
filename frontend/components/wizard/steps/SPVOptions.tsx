/**
 * SPV Encryption Toggle UI
 * Toggle switch allowing users to opt-in/out of client-side encryption
 * before provenance storage.
 *
 * @see Issue #68 – Frontend: SPV Encryption Toggle UI
 */
"use client";

import React, { useCallback, useState } from "react";
import { ShieldCheck, ShieldOff, Info, AlertTriangle } from "lucide-react";
import { useWizard } from "@/context/WizardContext";

export default function SPVOptions() {
  const { state, setEncryptionEnabled } = useWizard();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleToggle = useCallback(() => {
    setEncryptionEnabled(!state.encryptionEnabled);
  }, [state.encryptionEnabled, setEncryptionEnabled]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* Toggle card */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          {/* Left: icon + label */}
          <div className="flex items-center gap-3">
            {state.encryptionEnabled ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40">
                <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/40">
                <ShieldOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Client-Side Encryption
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {state.encryptionEnabled ? "Encrypted" : "Not Encrypted"}
              </p>
            </div>
          </div>

          {/* Right: toggle + info */}
          <div className="flex items-center gap-2">
            {/* Info tooltip */}
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                aria-label="Encryption info"
                className="text-gray-400 hover:text-primary transition"
              >
                <Info className="w-4 h-4" />
              </button>
              {showTooltip && (
                <div className="absolute right-0 bottom-full mb-2 w-64 px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-800 text-xs text-white shadow-lg z-10">
                  When encryption is enabled, your hash data is encrypted
                  locally in your browser before being stored. No unencrypted
                  data ever leaves your device.
                </div>
              )}
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={state.encryptionEnabled}
              onClick={handleToggle}
              className={`
                relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
                transition-colors duration-200 focus:outline-none focus:ring-2
                focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-white
                dark:focus:ring-offset-gray-900
                ${state.encryptionEnabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200
                  ${state.encryptionEnabled ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Warning when disabled */}
      {!state.encryptionEnabled && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-600 dark:text-yellow-400 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
              Encryption Disabled
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Without encryption, your hash data will be stored in plaintext.
              Anyone with access to the storage layer can read the provenance
              record. Re-enable encryption for maximum privacy.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
