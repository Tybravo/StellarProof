"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Lock, Loader2, FileText, Image as ImageIcon, Binary, AlertCircle, X } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { Modal } from "../ui/Modal";
import Button from "../ui/Button";
import { cn } from "@/utils/cn";

interface VaultItem {
  id: string;
  storageId: string;
  filename: string;
  size: number;
}

interface DecryptionPreviewProps {
  item: VaultItem;
}

/**
 * Mock function to simulate fetching encrypted data from storage.
 * In production, this would fetch the actual encrypted blob.
 */
async function getEncryptedData(storageId: string): Promise<ArrayBuffer> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  // Mock encrypted data (this would be actual AES-GCM encrypted bytes)
  return new TextEncoder().encode(`Mock encrypted content for ${storageId}`).buffer;
}

/**
 * Perform AES-GCM decryption using Web Crypto API.
 * This is a mock implementation that simulates the decryption process.
 */
async function decryptData(
  encryptedData: ArrayBuffer,
  key: string
): Promise<ArrayBuffer | null> {
  // Simulate cryptographic work
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // In a real implementation, we would use:
  // 1. PBKDF2 to derive a key from the passphrase
  // 2. crypto.subtle.decrypt(algorithm, cryptoKey, data)
  
  // For this mock, we'll "succeed" if the key is "correct-key"
  if (key === "correct-key") {
    return new TextEncoder().encode(`This is the decrypted content of the file.
It contains sensitive provenance data that was stored securely in the SPV Vault.

Filename: sample_document.pdf
Storage ID: ${new TextDecoder().decode(encryptedData).split(' ').pop()}
Status: Verified
    `).buffer;
  }

  // Fail for any other key
  return null;
}

export function DecryptionPreview({ item }: DecryptionPreviewProps) {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"input" | "decrypting" | "preview">("input");
  const [passphrase, setPassphrase] = useState("");
  const [decryptedContent, setDecryptedContent] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setPassphrase("");
    setDecryptedContent(null);
    setError(null);
    setStep("input");
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Securely clear sensitive data from memory
    resetState();
  };

  const handleDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;

    setStep("decrypting");
    setError(null);

    try {
      const encryptedData = await getEncryptedData(item.storageId);
      const result = await decryptData(encryptedData, passphrase);

      if (result) {
        setDecryptedContent(result);
        setStep("preview");
      } else {
        setError("Invalid decryption key. Please verify and try again.");
        setStep("input");
      }
    } catch (err) {
      console.error("Decryption error:", err);
      setError("An unexpected error occurred during decryption.");
      setStep("input");
    }
  };

  const renderPreview = () => {
    if (!decryptedContent) return null;

    const extension = item.filename.split(".").pop()?.toLowerCase();
    const text = new TextDecoder().decode(decryptedContent);

    // Simple routing based on file extension
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-black/20 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
          <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-500">Image preview would render here</p>
        </div>
      );
    }

    if (["txt", "pdf", "docx", "xlsx"].includes(extension || "")) {
      return (
        <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 font-mono text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto text-gray-800 dark:text-gray-300">
          {text}
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 text-gray-500 mb-3">
          <Binary className="w-4 h-4" />
          <span className="text-xs font-medium uppercase">Binary Hex Dump</span>
        </div>
        <div className="font-mono text-[10px] grid grid-cols-8 gap-2 text-gray-400">
          {Array.from(new Uint8Array(decryptedContent.slice(0, 64))).map((b, i) => (
            <span key={i}>{b.toString(16).padStart(2, "0")}</span>
          ))}
          <span>...</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        title="Decrypt Preview"
        aria-label="Decrypt Preview"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      <Modal open={isOpen} onClose={handleClose} size="md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none mb-1">
                  Secure Preview
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.filename}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {step === "input" && (
            <form onSubmit={handleDecrypt} className="space-y-4">
              <div>
                <label
                  htmlFor="passphrase"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Decryption Passphrase
                </label>
                <div className="relative">
                  <input
                    id="passphrase"
                    type="password"
                    required
                    autoFocus
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter your private key or passphrase"
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-900 dark:text-white"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 mt-2 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">{error}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full justify-center bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl shadow-button-glow transition-all"
                >
                  Decrypt & Preview
                </Button>
                <p className="text-[10px] text-gray-500 text-center mt-3 px-4">
                  Decryption happens entirely in your browser. Your key is never sent to the server.
                </p>
              </div>
            </form>
          )}

          {step === "decrypting" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Decrypting Asset...
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Performing client-side AES-GCM operations
              </p>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Decrypted Content
                </span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  <Eye className="w-3 h-3" />
                  Live Preview
                </span>
              </div>

              {renderPreview()}

              <div className="pt-2">
                <Button
                  onClick={handleClose}
                  className="w-full justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-900 dark:text-white font-semibold py-2.5 rounded-xl transition-all"
                >
                  Close Preview
                </Button>
                <p className="text-[10px] text-gray-500 text-center mt-3">
                  Closing this modal will permanently clear decrypted data from memory.
                </p>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
