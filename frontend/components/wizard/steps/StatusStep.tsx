/**
 * Submission Status Step
 * Post-submission screen that shows request ID, transaction hash, status badge,
 * success animation, next-steps, and a shareable link.
 * Auto-refreshes status via polling hook.
 *
 * @see Issue #76 – Frontend: Submission Status Screen
 */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  LayoutDashboard,
  Award,
  RefreshCw,
  Clock,
  Share2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

export type SubmissionStatus = "pending" | "verified" | "rejected";

export interface StatusStepProps {
  /** Unique request / submission ID */
  requestId: string;
  /** On-chain transaction hash */
  txHash: string;
  /** Current status — drives badge colour and success animation */
  status: SubmissionStatus;
  /** Network used for the explorer link (default: "public") */
  network?: "public" | "testnet";
  /** Called by the polling hook to re-fetch current status */
  onRefresh?: () => Promise<SubmissionStatus> | SubmissionStatus;
  /** Polling interval in ms (0 = disabled, default 5000) */
  pollIntervalMs?: number;
  /** Link to the certificate viewer for this submission */
  certificateUrl?: string;
  /** Link to the dashboard */
  dashboardUrl?: string;
}

/* ------------------------------------------------------------------ */
/*                          Confetti particle                          */
/* ------------------------------------------------------------------ */

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  color: string;
  size: number;
  duration: number;
}

const CONFETTI_COLORS = [
  "#256af4", // primary
  "#60a5fa", // primary-light
  "#ff7ce9", // secondary
  "#ffb7f3", // secondary-light
  "#34d399", // green
  "#fbbf24", // amber
];

function generateParticles(count = 40): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 40 + Math.random() * 20, // near center-top
    y: 0,
    angle: Math.random() * 360,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 6,
    duration: 1.2 + Math.random() * 0.8,
  }));
}

function Confetti() {
  const particles = useRef(generateParticles()).current;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: -10, opacity: 1, rotate: 0 }}
          animate={{
            y: "100vh",
            x: `${p.x + (Math.random() - 0.5) * 30}vw`,
            opacity: [1, 1, 0],
            rotate: p.angle,
          }}
          transition={{ duration: p.duration, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : 2,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                        Status Badge                                 */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; icon: React.ReactNode; classes: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    classes:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700",
  },
  verified: {
    label: "Verified",
    icon: <CheckCircle2 className="w-4 h-4" />,
    classes:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-4 h-4" />,
    classes:
      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700",
  },
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${cfg.classes}`}
      >
        {cfg.icon}
        {cfg.label}
      </motion.span>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*                       Copy Button                                   */
/* ------------------------------------------------------------------ */

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label ?? value}`}
      title={copied ? "Copied!" : "Copy"}
      className="flex items-center gap-1 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-primary/5 transition-colors shrink-0"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="w-3.5 h-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*                    Shareable Link Copy Row                          */
/* ------------------------------------------------------------------ */

function ShareableLink({ requestId }: { requestId: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify?id=${requestId}`
      : `/verify?id=${requestId}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silently fail
    }
  }, [shareUrl]);

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
      <Share2 className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
      <span className="flex-1 text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
        {shareUrl}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy shareable link"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors shrink-0"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3" aria-hidden />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" aria-hidden />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                       Main Component                                */
/* ------------------------------------------------------------------ */

export default function StatusStep({
  requestId,
  txHash,
  status: initialStatus,
  network = "public",
  onRefresh,
  pollIntervalMs = 5000,
  certificateUrl,
  dashboardUrl = "/",
}: StatusStepProps) {
  const [status, setStatus] = useState<SubmissionStatus>(initialStatus);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const prevStatusRef = useRef<SubmissionStatus>(initialStatus);

  // ── Keep in sync if parent updates status prop (e.g. after full page refresh)
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // ── Trigger confetti when status transitions to "verified"
  useEffect(() => {
    if (status === "verified" && prevStatusRef.current !== "verified") {
      setConfettiKey((k) => k + 1);
    }
    prevStatusRef.current = status;
  }, [status]);

  // ── Polling hook: auto-refresh while pending
  useEffect(() => {
    if (!onRefresh || pollIntervalMs === 0 || status !== "pending") return;

    const interval = setInterval(async () => {
      setIsPolling(true);
      try {
        const next = await onRefresh();
        setStatus(next);
        setLastPollAt(new Date());
      } finally {
        setIsPolling(false);
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [onRefresh, pollIntervalMs, status]);

  // ── Manual refresh
  const handleManualRefresh = useCallback(async () => {
    if (!onRefresh || isPolling) return;
    setIsPolling(true);
    try {
      const next = await onRefresh();
      setStatus(next);
      setLastPollAt(new Date());
    } finally {
      setIsPolling(false);
    }
  }, [onRefresh, isPolling]);

  const explorerUrl =
    network === "testnet"
      ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
      : `https://stellar.expert/explorer/public/tx/${txHash}`;

  const truncate = (s: string, n = 12) =>
    s.length > n * 2 + 3 ? `${s.slice(0, n)}…${s.slice(-n)}` : s;

  const lastPollLabel = lastPollAt
    ? lastPollAt.toLocaleTimeString(undefined, { timeStyle: "short" })
    : null;

  /* ---------------------------------------------------------------- */
  /*                            Render                                */
  /* ---------------------------------------------------------------- */

  return (
    <div className="w-full max-w-xl mx-auto space-y-5 relative">
      {/* Confetti on verified */}
      <AnimatePresence>
        {status === "verified" && (
          <Confetti key={`confetti-${confettiKey}`} />
        )}
      </AnimatePresence>

      {/* ── Hero status card ── */}
      <motion.div
        layout
        className={`rounded-2xl border p-6 text-center space-y-3 ${
          status === "verified"
            ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950/20"
            : status === "rejected"
            ? "border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-950/20"
            : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5"
        }`}
      >
        {/* Animated icon */}
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            {status === "verified" ? (
              <motion.div
                key="verified-icon"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40"
              >
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" aria-hidden />
              </motion.div>
            ) : status === "rejected" ? (
              <motion.div
                key="rejected-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40"
              >
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden />
              </motion.div>
            ) : (
              <motion.div
                key="pending-icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40"
              >
                <Loader2 className="h-8 w-8 text-yellow-600 dark:text-yellow-400 animate-spin" aria-hidden />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {status === "verified"
                ? "Record Verified!"
                : status === "rejected"
                ? "Verification Rejected"
                : "Awaiting Verification…"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {status === "verified"
                ? "Your provenance record has been cryptographically verified on the Stellar network."
                : status === "rejected"
                ? "Your submission was rejected. Please review the details and resubmit."
                : "Your submission is being processed. This usually takes a few seconds."}
            </p>
          </motion.div>
        </AnimatePresence>

        <StatusBadge status={status} />
      </motion.div>

      {/* ── Details ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/10">
        {/* Request ID */}
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Request ID</p>
            <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
              {requestId}
            </p>
          </div>
          <CopyButton value={requestId} label="request ID" />
        </div>

        {/* Transaction Hash */}
        <div className="flex items-center gap-3 px-5 py-3.5">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Transaction Hash</p>
            <p className="text-sm font-mono text-gray-800 dark:text-gray-200">
              {truncate(txHash, 14)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CopyButton value={txHash} label="transaction hash" />
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View transaction on Stellar Explorer"
              title="View on Stellar Explorer"
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Polling row */}
        {onRefresh && (
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-2">
              {isPolling ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" aria-hidden />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" aria-hidden />
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isPolling
                  ? "Checking status…"
                  : lastPollLabel
                  ? `Last checked at ${lastPollLabel}`
                  : "Auto-refreshing every 5s"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isPolling || status !== "pending"}
              aria-label="Refresh status"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isPolling ? "animate-spin" : ""}`} aria-hidden />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Shareable link ── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Share your record
        </p>
        <ShareableLink requestId={requestId} />
      </div>

      {/* ── Next steps ── */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Next steps
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={dashboardUrl}
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/40 dark:hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20 group-hover:bg-primary/20 transition-colors">
              <LayoutDashboard className="h-4.5 w-4.5 text-primary" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Go to Dashboard
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                View all your submissions
              </p>
            </div>
          </a>

          {certificateUrl && (
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-secondary/40 dark:hover:border-secondary/30 hover:shadow-sm transition-all group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 dark:bg-secondary/15 group-hover:bg-secondary/20 transition-colors">
                <Award className="h-4.5 w-4.5 text-secondary" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  View Certificate
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Download or share proof
                </p>
              </div>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
