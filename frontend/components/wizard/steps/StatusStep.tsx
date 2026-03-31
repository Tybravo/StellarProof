"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";

type LocalStatus = "Pending" | "Verified" | "Rejected" | "Timeout";

interface StatusStepProps {
  requestId: string;
  onReset: () => void;
}

interface Particle {
  id: number;
  x: number;
  angle: number;
  size: number;
  driftX: number;
  duration: number;
  color: string;
  borderRadius: number | "50%";
}

const CONFETTI_COLORS = ["#256af4", "#60a5fa", "#ff7ce9", "#34d399", "#fbbf24"];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateParticles(seed: number, count = 36): Particle[] {
  const rand = (s: number) => {
    const x = Math.sin(s) * 10_000;
    return x - Math.floor(x);
  };

  return Array.from({ length: count }, (_, i) => {
    const base = seed + i * 97;
    const r1 = rand(base + 1);
    const r2 = rand(base + 2);
    const r3 = rand(base + 3);
    const r4 = rand(base + 4);
    const r5 = rand(base + 5);
    const r6 = rand(base + 6);
    const r7 = rand(base + 7);

    return {
      id: i,
      x: 40 + r1 * 20,
      angle: r2 * 360,
      size: 6 + r4 * 6,
      driftX: (r6 - 0.5) * 30,
      duration: 1.2 + r5 * 0.8,
      color: CONFETTI_COLORS[Math.floor(r3 * CONFETTI_COLORS.length)],
      borderRadius: r7 > 0.5 ? "50%" : 2,
    };
  });
}

function Confetti({ seed }: { seed: number }) {
  const particles = useMemo(() => generateParticles(seed), [seed]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: -10, opacity: 1, rotate: 0 }}
          animate={{
            y: "100vh",
            x: `${p.x + p.driftX}vw`,
            opacity: [1, 1, 0],
            rotate: p.angle,
          }}
          transition={{ duration: p.duration, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: p.borderRadius,
            backgroundColor: p.color,
          }}
        />
      ))}
    </div>
  );
}

export default function StatusStep({ requestId, onReset }: StatusStepProps) {
  const { status, isLoading, lastChecked } = useVerificationStatus({
    requestId,
    intervalMs: 5000,
  });

  const normalized = (status === "Timeout" ? "Timeout" : status) as LocalStatus;
  const confettiSeed = useMemo(() => hashSeed(requestId), [requestId]);

  const isVerified = normalized === "Verified";
  const isRejected = normalized === "Rejected";
  const isTimeout = normalized === "Timeout";
  const isPending = normalized === "Pending";

  const title = isVerified
    ? "Verification Successful"
    : isRejected
      ? "Verification Failed"
      : isTimeout
        ? "Verification Timed Out"
        : "Verifying on Stellar…";

  const subtitle = isVerified
    ? "Your content has been cryptographically signed and anchored to the Stellar network."
    : isRejected
      ? "The oracle could not verify the authenticity of this content. Please check your source."
      : isTimeout
        ? "The oracle did not respond within the expected timeframe."
        : "The Soroban Oracle is currently processing your request. This usually takes a few seconds.";

  const icon = isVerified ? (
    <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" aria-hidden />
  ) : isRejected || isTimeout ? (
    <XCircle className="w-16 h-16 text-red-500 mb-6" aria-hidden />
  ) : (
    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" aria-hidden />
  );

  return (
    <div className="relative w-full max-w-xl mx-auto py-12 text-center">
      <AnimatePresence>
        {isVerified && <Confetti key={`confetti-${requestId}`} seed={confettiSeed} />}
      </AnimatePresence>

      <div className="flex flex-col items-center justify-center">
        {icon}
        <motion.h2
          key={normalized}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="text-3xl font-bold mb-4 text-gray-900 dark:text-white"
        >
          {title}
        </motion.h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          {subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading && isPending}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            New Request
          </button>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${requestId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            View Explorer <ExternalLink className="ml-2 w-4 h-4" />
          </a>
        </div>

        {lastChecked && (
          <p className="mt-8 text-xs text-gray-400">
            Last synced with network: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
