'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

export interface AttestationSuccessProps {
  open: boolean;
  onClose: () => void;
  onContinue?: () => void;
}

const PARTICLES = [
  { x: -100, y: -70, color: '#059669', rotate: -40 },
  { x: -60, y: -110, color: '#2563eb', rotate: 65 },
  { x: -20, y: -95, color: '#eab308', rotate: 20 },
  { x: 25, y: -110, color: '#dc2626', rotate: -55 },
  { x: 70, y: -90, color: '#7c3aed', rotate: 45 },
  { x: 105, y: -55, color: '#0891b2', rotate: 80 },
];

export default function AttestationSuccess({ open, onClose, onContinue }: AttestationSuccessProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="attestation-success-title"
            className="relative w-full max-w-md overflow-hidden rounded-lg bg-white p-6 shadow-xl dark:bg-gray-950"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center text-gray-500 hover:text-gray-950 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center">
              {!reduceMotion && PARTICLES.map((particle, index) => (
                <motion.span
                  key={`${particle.x}-${particle.y}`}
                  className="absolute h-2 w-1.5"
                  style={{ backgroundColor: particle.color }}
                  initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
                  animate={{ x: particle.x, y: particle.y, opacity: [0, 1, 0], rotate: particle.rotate }}
                  transition={{ duration: 0.9, delay: 0.12 + index * 0.04, ease: 'easeOut' }}
                />
              ))}
              <motion.div
                initial={reduceMotion ? undefined : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.08 }}
              >
                <CheckCircle2 className="h-16 w-16 text-emerald-600" aria-hidden="true" />
              </motion.div>
            </div>

            <h2 id="attestation-success-title" className="text-center text-xl font-semibold text-gray-950 dark:text-white">
              Attestation confirmed
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-gray-600 dark:text-gray-300">
              The Oracle proof is now confirmed on Stellar.
            </p>
            <button
              type="button"
              onClick={onContinue ?? onClose}
              className="mt-6 h-11 w-full rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Continue
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
