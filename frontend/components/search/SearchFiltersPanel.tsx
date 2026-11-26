"use client";

import React, { useEffect, useState, useRef, useId, useCallback } from "react";
import {
  Calendar,
  Filter,
  RotateCcw,
  ShieldCheck,
  User,
  X,
  FileText,
  Lock,
  ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/utils/cn";
import type {
  SearchFilters,
  SpvPrivacyStatus,
  SearchFileType,
} from "@/hooks/useSearchFilters";
import { DEFAULT_SEARCH_FILTERS } from "@/hooks/useSearchFilters";

export interface SearchFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: Partial<SearchFilters>;
  onApply?: (filters: SearchFilters) => void;
  onReset?: () => void;
  title?: string;
  className?: string;
}

export const PRIVACY_OPTIONS: { value: SpvPrivacyStatus; label: string; description: string }[] = [
  { value: "all", label: "All Privacy Levels", description: "Show both public and protected records" },
  { value: "public", label: "Public", description: "Unrestricted cryptographic provenance" },
  { value: "private", label: "Private", description: "Encrypted SPV blobs with key protection" },
  { value: "restricted", label: "Restricted", description: "Access-controlled policy enforced" },
];

export const FILE_TYPE_OPTIONS: { value: SearchFileType; label: string }[] = [
  { value: "all", label: "All File Types" },
  { value: "pdf", label: "PDF Documents" },
  { value: "image", label: "Images (JPG, PNG, WebP)" },
  { value: "video", label: "Videos (MP4, WebM)" },
  { value: "document", label: "Text / Office Documents" },
  { value: "archive", label: "Compressed Archives (ZIP, TAR)" },
  { value: "other", label: "Other Asset Types" },
];

export function SearchFiltersPanel({
  isOpen,
  onClose,
  filters = {},
  onApply,
  onReset,
  title = "Search Filters",
  className,
}: SearchFiltersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const prefersReducedMotion = useReducedMotion();

  const [draft, setDraft] = useState<SearchFilters>(() => ({
    ...DEFAULT_SEARCH_FILTERS,
    ...(filters as SearchFilters),
  }));

  const [dateError, setDateError] = useState<string | null>(null);

  // Re-sync draft state whenever the panel transitions from closed to open
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setDraft({
        ...DEFAULT_SEARCH_FILTERS,
        ...(filters as SearchFilters),
      });
      setDateError(null);
    }
  }

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const updateDraft = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      setDraft((prev) => {
        const next = { ...prev, [key]: value };

        // Validate date ranges
        if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) {
          setDateError("Start date cannot be after end date");
        } else {
          setDateError(null);
        }

        return next;
      });
    },
    []
  );

  const handleReset = () => {
    setDraft(DEFAULT_SEARCH_FILTERS);
    setDateError(null);
    onReset?.();
  };

  const handleApply = () => {
    if (dateError) return;
    onApply?.(draft);
    onClose();
  };

  const hasActiveFilters =
    draft.dateFrom !== "" ||
    draft.dateTo !== "" ||
    draft.privacyStatus !== "all" ||
    draft.fileType !== "all" ||
    draft.creator.trim() !== "" ||
    draft.status !== "all";

  const duration = prefersReducedMotion ? 0 : 0.25;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            {/* Slide-out drawer panel */}
            <motion.div
              ref={panelRef}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, duration }}
              className={cn(
                "w-screen max-w-md bg-white dark:bg-[#0B0F19] border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col",
                className
              )}
            >
              {/* Panel Header */}
              <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <h2
                      id={titleId}
                      className="text-base font-semibold text-gray-900 dark:text-white"
                    >
                      {title}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Refine assets by date, privacy, or file type
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                      title="Reset filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Close filters panel"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Panel Body / Form Inputs */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Date range filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      Date Range
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                        From
                      </span>
                      <input
                        type="date"
                        aria-label="Date from"
                        value={draft.dateFrom}
                        max={draft.dateTo || undefined}
                        onChange={(e) => updateDraft("dateFrom", e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                        To
                      </span>
                      <input
                        type="date"
                        aria-label="Date to"
                        value={draft.dateTo}
                        min={draft.dateFrom || undefined}
                        onChange={(e) => updateDraft("dateTo", e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                      />
                    </div>
                  </div>
                  {dateError && (
                    <p className="text-xs text-red-500 mt-1">{dateError}</p>
                  )}
                </div>

                {/* SPV Privacy Status Filter */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Privacy Status
                  </label>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="group"
                    aria-label="Privacy status options"
                  >
                    {PRIVACY_OPTIONS.map((opt) => {
                      const selected = draft.privacyStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateDraft("privacyStatus", opt.value)}
                          aria-pressed={selected}
                          className={cn(
                            "px-3 py-2 text-left rounded-xl border text-xs font-medium transition-all duration-150 flex flex-col gap-0.5",
                            selected
                              ? "bg-primary/10 border-primary text-primary ring-1 ring-primary"
                              : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                        >
                          <span className="font-semibold">{opt.label}</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {draft.privacyStatus !== "all" && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg border border-gray-200 dark:border-white/10">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      <span>Filtering by {draft.privacyStatus} SPV records only</span>
                    </div>
                  )}
                </div>

                {/* File Type Filter */}
                <div className="space-y-3">
                  <label
                    htmlFor="search-file-type-select"
                    className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    File Type
                  </label>
                  <div className="relative">
                    <select
                      id="search-file-type-select"
                      aria-label="File type"
                      value={draft.fileType}
                      onChange={(e) =>
                        updateDraft("fileType", e.target.value as SearchFileType)
                      }
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                    >
                      {FILE_TYPE_OPTIONS.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Creator / Owner Wallet Filter */}
                <div className="space-y-3">
                  <label
                    htmlFor="search-creator-input"
                    className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-primary" />
                    Creator Address
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="search-creator-input"
                      type="text"
                      aria-label="Creator"
                      placeholder="e.g. GABCD... or username"
                      value={draft.creator}
                      onChange={(e) => updateDraft("creator", e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Panel Footer / Actions */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(dateError)}
                  onClick={handleApply}
                  className={cn(
                    "px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-all shadow-button-glow flex items-center gap-1.5",
                    dateError && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span>Apply Filters</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SearchFiltersTrigger({
  onClick,
  activeCount = 0,
  className,
}: {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search filters"
      className={cn(
        "inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors",
        activeCount > 0
          ? "bg-primary/10 border-primary text-primary"
          : "bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10",
        className
      )}
    >
      <Filter className="w-4 h-4" />
      <span>Filters</span>
      {activeCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold rounded-full bg-primary text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}

export default SearchFiltersPanel;
