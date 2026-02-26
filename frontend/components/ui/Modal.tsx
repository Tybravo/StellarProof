"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type Size = "sm" | "md" | "lg" | "full";

const sizeClasses: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  full: "max-w-[calc(100vw-2rem)]",
};

interface ModalContextValue {
  onClose: () => void;
  headerId: string;
  bodyId: string;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("Modal subcomponents must be used inside Modal");
  return ctx;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

export function Modal({
  open,
  onClose,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: Size;
}) {
  const headerId = useId();
  const bodyId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousActiveRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = getFocusableElements(panelRef.current);
      const panel = panelRef.current;
      const active = document.activeElement;
      if (focusables.length === 0) {
        if (active !== panel) {
          e.preventDefault();
          panel.focus();
        }
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (active === first || active === panel) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || active === panel) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusables = getFocusableElements(panelRef.current);
    const toFocus = focusables[0] ?? panelRef.current;
    (toFocus as HTMLElement).focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open && previousActiveRef.current) {
      previousActiveRef.current.focus();
      previousActiveRef.current = null;
    }
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose();
  };

  const value: ModalContextValue = {
    onClose: handleClose,
    headerId,
    bodyId,
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <ModalContext.Provider value={value}>
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleOverlayClick}
          >
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headerId}
              aria-describedby={bodyId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`relative w-full rounded-xl border border-white/10 bg-darkblue shadow-xl ${sizeClasses[size]} overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        </ModalContext.Provider>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ModalHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { headerId } = useModalContext();
  return (
    <div id={headerId} className={`px-6 py-4 border-b border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { bodyId } = useModalContext();
  return (
    <div id={bodyId} className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-white/10 flex justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
}
