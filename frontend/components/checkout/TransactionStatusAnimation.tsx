"use client";

import React from "react";
import { motion } from "framer-motion";

interface TransactionStatusAnimationProps {
  status: "success" | "error";
  className?: string;
  size?: number;
}

export default function TransactionStatusAnimation({
  status,
  className = "",
  size = 56,
}: TransactionStatusAnimationProps) {
  const isSuccess = status === "success";

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label={isSuccess ? "Transaction succeeded" : "Transaction failed"}
      data-testid={`transaction-animation-${status}`}
    >
      {/* Outer Pulse Ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: [0.8, 1.25, 1], opacity: [0, 0.4, 0.15] }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`absolute inset-0 rounded-full ${
          isSuccess ? "bg-emerald-500/20" : "bg-red-500/20"
        }`}
      />

      {/* SVG Container */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* Background Circle */}
        <motion.circle
          cx="28"
          cy="28"
          r="24"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
          className={
            isSuccess
              ? "fill-emerald-500/10 stroke-emerald-500"
              : "fill-red-500/10 stroke-red-500"
          }
          strokeWidth="3"
        />

        {isSuccess ? (
          /* Animated Checkmark Path */
          <motion.path
            d="M17 28.5L24.5 36L39 20"
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.45, ease: "easeOut", delay: 0.2 },
              opacity: { duration: 0.1, delay: 0.2 },
            }}
          />
        ) : (
          /* Animated Cross (X) Paths */
          <g>
            <motion.path
              d="M19 19L37 37"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.35, ease: "easeOut", delay: 0.2 },
                opacity: { duration: 0.1, delay: 0.2 },
              }}
            />
            <motion.path
              d="M37 19L19 37"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 0.35, ease: "easeOut", delay: 0.3 },
                opacity: { duration: 0.1, delay: 0.3 },
              }}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
