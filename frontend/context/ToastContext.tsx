"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "loading";
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 9);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);

    if (toast.duration !== Infinity) {
      setTimeout(() => removeToast(id), toast.duration || 4000);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-50 flex flex-col space-y-2"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={clsx(
                "p-4 rounded shadow-lg text-white",
                toast.type === "success" && "bg-green-500",
                toast.type === "error" && "bg-red-500",
                toast.type === "info" && "bg-blue-500",
                toast.type === "loading" && "bg-gray-500",
              )}
            >
              <div className="flex justify-between items-center">
                <span>{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="ml-4 text-white hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
