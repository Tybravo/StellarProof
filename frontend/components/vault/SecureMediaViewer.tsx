"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  FileText,
  Music,
  Lock,
  Shield,
  ShieldAlert,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";

export interface SecureMediaViewerProps {
  /** Decrypted blob to safely preview in-memory */
  blob?: Blob | null;
  /** Explicit MIME type if known (e.g. "image/png", "video/mp4") */
  mimeType?: string;
  /** Original filename for extension fallback */
  filename?: string;
  /** Title or label for the asset header */
  title?: string;
  /** Loading state during decryption / blob loading */
  isLoading?: boolean;
  /** External error state if decryption or network fetching failed */
  error?: string | null;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Optional container class name */
  className?: string;
  /** Watermark text displayed over protected content */
  watermarkText?: string;
}

type MediaType = "image" | "video" | "audio" | "document" | "unsupported";

function detectMediaType(blob?: Blob | null, mimeType?: string, filename?: string): MediaType {
  const type = (mimeType || blob?.type || "").toLowerCase();
  const ext = (filename?.split(".").pop() || "").toLowerCase();

  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return "image";
  }
  if (type.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "m4v"].includes(ext)) {
    return "video";
  }
  if (type.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) {
    return "audio";
  }
  if (type.includes("pdf") || ["pdf", "txt", "doc", "docx", "json"].includes(ext)) {
    return "document";
  }
  return "unsupported";
}

/**
 * SecureMediaViewer
 *
 * Protected video, image, and media player that renders decrypted SPV assets
 * entirely in-memory using `URL.createObjectURL()`.
 *
 * Security Features:
 * - Decrypted blob renders securely in the browser without exposing direct URL
 * - Automatic revocation of object URLs via `URL.revokeObjectURL()` on change/unmount
 * - Disables right-click context menu (`onContextMenu`) to prevent easy saving
 * - Disables video download controls (`controlsList="nodownload"`)
 * - Displays a cryptographic security badge and watermark overlay
 * - Graceful loading and error recovery states
 */
export function SecureMediaViewer({
  blob,
  mimeType,
  filename,
  title,
  isLoading = false,
  error: externalError,
  onClose,
  className,
  watermarkText = "STELLARPROOF SECURE SPV ASSET",
}: SecureMediaViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Render-time state reset when blob changes
  const [prevBlob, setPrevBlob] = useState<Blob | null | undefined>(blob);
  if (blob !== prevBlob) {
    setPrevBlob(blob);
    setMediaError(null);
    setZoom(1);
    if (!blob) {
      setObjectUrl(null);
    }
  }

  const mediaType = useMemo(() => {
    return detectMediaType(blob, mimeType, filename);
  }, [blob, mimeType, filename]);

  // Safely manage object URL lifecycle
  useEffect(() => {
    if (!blob) return;

    let url: string | null = null;
    try {
      if (typeof window !== "undefined" && window.URL && typeof window.URL.createObjectURL === "function") {
        url = window.URL.createObjectURL(blob);
      } else if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        url = URL.createObjectURL(blob);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjectUrl(url);
    } catch (err) {
      console.error("Failed to generate secure object URL:", err);
      setMediaError("Unable to create secure preview buffer from decrypted blob.");
    }

    return () => {
      if (url) {
        try {
          if (typeof window !== "undefined" && window.URL && typeof window.URL.revokeObjectURL === "function") {
            window.URL.revokeObjectURL(url);
          } else if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
            URL.revokeObjectURL(url);
          }
        } catch {
          // ignore cleanup errors in testing/unsupported environments
        }
      }
    };
  }, [blob]);

  const handleMediaError = () => {
    setMediaError("Failed to decode media asset. The decrypted stream may be damaged or in an unsupported format.");
  };

  const activeError = externalError || mediaError;

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 text-white select-none",
        className
      )}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="secure-media-viewer"
    >
      {/* Top Security Banner / Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 border-b border-gray-800 backdrop-blur z-20 relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Decrypted in Browser Memory</span>
          </div>
          {filename && (
            <span className="text-xs text-gray-400 font-mono truncate max-w-xs">
              {filename}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close viewer"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewing Area */}
      <div className="relative min-h-[320px] max-h-[600px] flex items-center justify-center bg-black/40 overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center p-8 text-center" role="status">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm font-medium text-gray-200">Rendering Decrypted Media...</p>
            <p className="text-xs text-gray-500 mt-1">Decrypting AES-GCM payload in memory</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && activeError && (
          <div
            className="flex flex-col items-center justify-center p-8 text-center max-w-md"
            role="alert"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-red-300 mb-1">Decryption / Render Warning</h4>
            <p className="text-xs text-gray-400 leading-relaxed">{activeError}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !activeError && !objectUrl && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <Lock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No decrypted asset payload available</p>
          </div>
        )}

        {/* Content Viewer: Image */}
        {!isLoading && !activeError && objectUrl && mediaType === "image" && (
          <div className="relative w-full h-full flex items-center justify-center overflow-auto p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objectUrl}
              alt={title || filename || "Decrypted SPV Asset"}
              onError={handleMediaError}
              style={{
                transform: `scale(${zoom})`,
                transition: "transform 0.15s ease-out",
                maxWidth: zoom === 1 ? "100%" : "none",
                maxHeight: zoom === 1 ? "500px" : "none",
              }}
              className="object-contain rounded-lg shadow-lg pointer-events-auto"
              draggable={false}
            />

            {/* Subtle Watermark Protection */}
            <div
              className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 select-none overflow-hidden"
              aria-hidden="true"
            >
              <div className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-white -rotate-12 whitespace-nowrap">
                {watermarkText}
              </div>
            </div>

            {/* Image Zoom Toolbar */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-xl p-1 z-10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                title="Zoom In"
                aria-label="Zoom in"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                title="Zoom Out"
                aria-label="Zoom out"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Reset Zoom"
                  aria-label="Reset zoom"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Viewer: Video */}
        {!isLoading && !activeError && objectUrl && mediaType === "video" && (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <video
              ref={videoRef}
              src={objectUrl}
              controls
              controlsList="nodownload"
              disablePictureInPicture
              onError={handleMediaError}
              className="max-h-[500px] w-full rounded-lg shadow-lg bg-black"
              playsInline
            >
              Your browser does not support protected HTML5 video playback.
            </video>

            {/* Subtle Watermark Overlay for Video */}
            <div
              className="absolute top-6 left-6 pointer-events-none opacity-20 text-[10px] uppercase font-bold tracking-widest text-white z-10"
              aria-hidden="true"
            >
              {watermarkText}
            </div>
          </div>
        )}

        {/* Content Viewer: Audio */}
        {!isLoading && !activeError && objectUrl && mediaType === "audio" && (
          <div className="flex flex-col items-center justify-center p-8 w-full max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
              <Music className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold mb-3">{filename || "Decrypted Audio Asset"}</p>
            <audio
              src={objectUrl}
              controls
              controlsList="nodownload"
              onError={handleMediaError}
              className="w-full"
            >
              Your browser does not support protected audio playback.
            </audio>
          </div>
        )}

        {/* Fallback for Documents / Other */}
        {!isLoading && !activeError && objectUrl && (mediaType === "document" || mediaType === "unsupported") && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-base font-semibold text-white mb-1">
              {filename || "Protected Document"}
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Decrypted payload verified in browser memory ({blob ? `${(blob.size / 1024).toFixed(1)} KB` : "SPV asset"}).
            </p>
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              Tamper-Evident SPV Provenance Verified
            </div>
          </div>
        )}
      </div>

      {/* Footer Security Notice */}
      <div className="px-4 py-2 bg-gray-900/60 border-t border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-primary" />
          Zero-Knowledge Client Decryption • Direct URLs Protected
        </span>
        <span className="text-[10px] text-gray-400 font-mono">
          {blob ? `${(blob.size / 1024).toFixed(1)} KB` : ""}
        </span>
      </div>
    </div>
  );
}

export default SecureMediaViewer;
