"use client";

import React, { useState } from "react";
import { Download, Loader2, ShieldAlert } from "lucide-react";
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

interface VaultActionsProps {
  item: VaultItem;
}

/**
 * Mock service to fetch encrypted blob data.
 * In a real app, this would be an API call to the storage service.
 */
async function fetchEncryptedBlob(
  storageId: string,
  onProgress: (percent: number) => void,
): Promise<Blob> {
  // Simulate download progress for large files
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    onProgress((i / steps) * 100);
  }

  // Return a mock encrypted blob
  const mockData = `Encrypted content for ${storageId}`;
  return new Blob([mockData], { type: "application/octet-stream" });
}

export function VaultActions({ item }: VaultActionsProps) {
  const { addToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDownload = async () => {
    setShowConfirm(false);
    setIsDownloading(true);
    setProgress(0);

    try {
      const blob = await fetchEncryptedBlob(item.storageId, (p) =>
        setProgress(p),
      );

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.filename}.enc`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addToast(`Downloaded ${item.filename}.enc successfully`, "success");
    } catch (error) {
      console.error("Download failed:", error);
      addToast("Failed to download encrypted file. Please try again.", "error");
    } finally {
      setIsDownloading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={isDownloading}
          className={cn(
            "p-1.5 rounded-lg transition-colors flex items-center justify-center min-w-[32px] min-h-[32px]",
            "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10",
            isDownloading && "opacity-50 cursor-not-allowed",
          )}
          title="Download Encrypted"
          aria-label="Download Encrypted"
        >
          {isDownloading ? (
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progress > 0 && (
                <span className="absolute -top-6 text-[10px] font-bold text-primary">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} size="sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-amber-500">
            <ShieldAlert className="w-6 h-6" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Confirm Backup
            </h3>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            You are about to download{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {item.filename}.enc
            </span>
            . This file is{" "}
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              still encrypted
            </span>{" "}
            and cannot be opened without your original decryption key.
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleDownload}
              className="w-full justify-center bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-all shadow-button-glow"
            >
              Download Encrypted File
            </Button>
            <Button
              onClick={() => setShowConfirm(false)}
              className="w-full justify-center bg-transparent border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-medium py-2.5 rounded-xl transition-all"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
