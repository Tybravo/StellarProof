"use client";

import React, { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Accessible label for the toggle button (use when header content is not plain text) */
  "aria-label"?: string;
};

export default function Accordion({
  open,
  onToggle,
  header,
  children,
  className = "",
  "aria-label": ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (open && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open]);

  return (
    <div className={`w-full ${className}`} ref={ref}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-lg"
      >
        {header}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
