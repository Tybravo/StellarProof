"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Modal } from "./Modal";

type Size = "sm" | "md" | "lg" | "full";

export interface OpenModalOptions {
  /** Modal panel width. Defaults to "md". */
  size?: Size;
  /** Called after the modal has closed (via overlay click, Escape, or closeModal()). */
  onClose?: () => void;
}

interface ModalContextValue {
  /** Opens a modal rendering arbitrary content on top of the application. */
  openModal: (content: ReactNode, options?: OpenModalOptions) => void;
  /** Closes the currently open modal, if any. */
  closeModal: () => void;
  /** Whether a modal is currently open. */
  isOpen: boolean;
}

const ModalDispatchContext = createContext<ModalContextValue | null>(null);

/**
 * Hook for opening/closing modals from anywhere in the app without each
 * call site having to manage its own `open` boolean state or mount its
 * own `<Modal>` instance.
 *
 * @example
 * const { openModal, closeModal } = useModal();
 * openModal(
 *   <>
 *     <ModalHeader>Confirm</ModalHeader>
 *     <ModalBody>Are you sure?</ModalBody>
 *   </>,
 * );
 */
export function useModal(): ModalContextValue {
  const ctx = useContext(ModalDispatchContext);
  if (!ctx) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return ctx;
}

/**
 * Global modal/dialog context system. Mount once near the root of the app
 * (alongside the other providers in `app/layout.tsx`) so any descendant
 * component can open a modal with arbitrary content via `useModal()`,
 * without threading open/close state through props.
 *
 * Rendering is delegated to the existing `Modal` component, so modals
 * opened through this provider inherit its portal, focus-trap, Escape-to-
 * close, and scroll-lock behavior.
 */
export function ModalProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  const [size, setSize] = useState<Size>("md");
  const [isOpen, setIsOpen] = useState(false);
  const [onCloseCallback, setOnCloseCallback] = useState<(() => void) | undefined>(undefined);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openModal = useCallback((nextContent: ReactNode, options: OpenModalOptions = {}) => {
    setContent(nextContent);
    setSize(options.size ?? "md");
    setOnCloseCallback(options.onClose);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onCloseCallback?.();
  }, [onCloseCallback]);

  const value = useMemo<ModalContextValue>(
    () => ({ openModal, closeModal, isOpen }),
    [openModal, closeModal, isOpen]
  );

  return (
    <ModalDispatchContext.Provider value={value}>
      {children}
      <Modal open={isOpen} onClose={handleClose} size={size}>
        {content}
      </Modal>
    </ModalDispatchContext.Provider>
  );
}
