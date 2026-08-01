"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { SuspenseWrapper } from "@/components/common/SuspenseWrapper";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

export type SpvPrivacyStatus = "all" | "public" | "private" | "restricted";

export type SearchFileType =
  | "all"
  | "pdf"
  | "image"
  | "video"
  | "document"
  | "archive"
  | "other";

export interface AdvancedFilters {
  dateFrom: string;
  dateTo: string;
  privacyStatus: SpvPrivacyStatus;
  fileType: SearchFileType;
  creator: string;
}

export interface AdvancedFiltersModalProps {
  open: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
}

/* ------------------------------------------------------------------ */
/*                           Constants                                 */
/* ------------------------------------------------------------------ */

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  dateFrom: "",
  dateTo: "",
  privacyStatus: "all",
  fileType: "all",
  creator: "",
};

const PRIVACY_OPTIONS: { value: SpvPrivacyStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "restricted", label: "Restricted" },
];

const FILE_TYPE_OPTIONS: { value: SearchFileType; label: string }[] = [
  { value: "all", label: "All file types" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "archive", label: "Archive" },
  { value: "other", label: "Other" },
];

/* ------------------------------------------------------------------ */
/*                           Helpers                                   */
/* ------------------------------------------------------------------ */

export function hasActiveAdvancedFilters(f: AdvancedFilters): boolean {
  return (
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.privacyStatus !== "all" ||
    f.fileType !== "all" ||
    f.creator.trim() !== ""
  );
}

/* ------------------------------------------------------------------ */
/*                         URL search params                           */
/* ------------------------------------------------------------------ */

const FILTER_PARAM_KEYS = {
  dateFrom: "filterFrom",
  dateTo: "filterTo",
  privacyStatus: "privacy",
  fileType: "fileType",
  creator: "creator",
} as const;

const VALID_PRIVACY_STATUSES: SpvPrivacyStatus[] = PRIVACY_OPTIONS.map(
  (opt) => opt.value
);
const VALID_FILE_TYPES: SearchFileType[] = FILE_TYPE_OPTIONS.map(
  (opt) => opt.value
);

export function advancedFiltersToSearchParams(
  filters: AdvancedFilters
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set(FILTER_PARAM_KEYS.dateFrom, filters.dateFrom);
  if (filters.dateTo) params.set(FILTER_PARAM_KEYS.dateTo, filters.dateTo);
  if (filters.privacyStatus !== "all")
    params.set(FILTER_PARAM_KEYS.privacyStatus, filters.privacyStatus);
  if (filters.fileType !== "all")
    params.set(FILTER_PARAM_KEYS.fileType, filters.fileType);
  if (filters.creator.trim())
    params.set(FILTER_PARAM_KEYS.creator, filters.creator.trim());
  return params;
}

export function advancedFiltersFromSearchParams(
  params: URLSearchParams
): AdvancedFilters {
  const privacyRaw = params.get(FILTER_PARAM_KEYS.privacyStatus);
  const fileTypeRaw = params.get(FILTER_PARAM_KEYS.fileType);
  return {
    dateFrom: params.get(FILTER_PARAM_KEYS.dateFrom) ?? "",
    dateTo: params.get(FILTER_PARAM_KEYS.dateTo) ?? "",
    privacyStatus: VALID_PRIVACY_STATUSES.includes(
      privacyRaw as SpvPrivacyStatus
    )
      ? (privacyRaw as SpvPrivacyStatus)
      : "all",
    fileType: VALID_FILE_TYPES.includes(fileTypeRaw as SearchFileType)
      ? (fileTypeRaw as SearchFileType)
      : "all",
    creator: params.get(FILTER_PARAM_KEYS.creator) ?? "",
  };
}

/* ------------------------------------------------------------------ */
/*                        Sub-components                               */
/* ------------------------------------------------------------------ */

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
}

function DateField({ id, label, value, min, max, onChange }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-400">
        {label}
      </label>
      <div className="relative">
        <Calendar
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pl-8 pr-3 py-2 text-sm rounded-lg border w-full",
            "bg-darkblue-dark text-gray-100",
            "border-white/10",
            "focus:outline-none focus:ring-2 focus:ring-primary/60",
            "transition-colors"
          )}
        />
      </div>
    </div>
  );
}

interface ChipGroupProps<T extends string> {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function ChipGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-400">{legend}</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label={legend}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={selected}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 select-none",
                selected
                  ? "bg-primary/20 border-primary text-primary ring-1 ring-primary"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                     AdvancedFiltersModal                            */
/* ------------------------------------------------------------------ */

export function AdvancedFiltersModal({
  open,
  onClose,
  filters,
  onApply,
}: AdvancedFiltersModalProps) {
  const [draft, setDraft] = useState<AdvancedFilters>(filters);

  // Re-sync the draft to the incoming filters whenever the modal transitions
  // from closed to open, so each open starts from the current applied state.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  const update = <K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => setDraft(DEFAULT_ADVANCED_FILTERS);

  const handleCancel = () => {
    setDraft(filters);
    onClose();
  };

  const active = hasActiveAdvancedFilters(draft);

  return (
    <Modal open={open} onClose={handleCancel} size="lg">
      <ModalHeader>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-white">
            Advanced Filters
          </h2>
          {active && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <DateField
            id="advanced-filter-date-from"
            label="Date from"
            value={draft.dateFrom}
            max={draft.dateTo || undefined}
            onChange={(v) => update("dateFrom", v)}
          />
          <DateField
            id="advanced-filter-date-to"
            label="Date to"
            value={draft.dateTo}
            min={draft.dateFrom || undefined}
            onChange={(v) => update("dateTo", v)}
          />
        </div>

        {/* SPV privacy status */}
        <ChipGroup
          legend="SPV privacy status"
          options={PRIVACY_OPTIONS}
          value={draft.privacyStatus}
          onChange={(v) => update("privacyStatus", v)}
        />

        {/* File type */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="advanced-filter-file-type"
            className="text-xs font-medium text-gray-400"
          >
            File type
          </label>
          <select
            id="advanced-filter-file-type"
            value={draft.fileType}
            onChange={(e) =>
              update("fileType", e.target.value as SearchFileType)
            }
            className={cn(
              "px-3 py-2 text-sm rounded-lg border w-full",
              "bg-darkblue-dark text-gray-100",
              "border-white/10",
              "focus:outline-none focus:ring-2 focus:ring-primary/60",
              "transition-colors"
            )}
          >
            {FILE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Creator */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="advanced-filter-creator"
            className="text-xs font-medium text-gray-400"
          >
            Creator
          </label>
          <div className="relative">
            <User
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="advanced-filter-creator"
              type="text"
              value={draft.creator}
              onChange={(e) => update("creator", e.target.value)}
              placeholder="Wallet address or username…"
              className={cn(
                "pl-8 pr-3 py-2 text-sm rounded-lg border w-full",
                "bg-darkblue-dark text-gray-100",
                "placeholder-gray-500",
                "border-white/10",
                "focus:outline-none focus:ring-2 focus:ring-primary/60",
                "transition-colors"
              )}
            />
          </div>
        </div>

        {draft.privacyStatus !== "all" && (
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Only {draft.privacyStatus} SPV entries will be shown.
          </p>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-button-glow"
        >
          Apply Filters
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default AdvancedFiltersModal;

/* ------------------------------------------------------------------ */
/*                     AdvancedFiltersControl                          */
/* ------------------------------------------------------------------ */
/*
 * Drop-in trigger button + modal that keeps the applied filters in sync
 * with the URL's search params: initial state is read from the URL, and
 * every "Apply Filters" action updates the URL via router.replace so the
 * search is shareable and survives a refresh or browser back/forward.
 */

export interface AdvancedFiltersControlProps {
  className?: string;
  onFiltersChange?: (filters: AdvancedFilters) => void;
}

function AdvancedFiltersControlContent({
  className,
  onFiltersChange,
}: AdvancedFiltersControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(() =>
    advancedFiltersFromSearchParams(searchParams)
  );

  // Re-derive filters from the URL whenever the search params change
  // externally (browser back/forward, a link with query params, etc.).
  // Uses render-time state adjustment to avoid a setState-in-effect loop.
  const searchParamsKey = searchParams.toString();
  const [prevSearchParamsKey, setPrevSearchParamsKey] =
    useState(searchParamsKey);
  if (searchParamsKey !== prevSearchParamsKey) {
    setPrevSearchParamsKey(searchParamsKey);
    setFilters(advancedFiltersFromSearchParams(searchParams));
  }

  useEffect(() => {
    onFiltersChange?.(advancedFiltersFromSearchParams(searchParams));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);

  const handleApply = useCallback(
    (next: AdvancedFilters) => {
      setFilters(next);
      const qs = advancedFiltersToSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const active = hasActiveAdvancedFilters(filters);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors",
          active
            ? "bg-primary/10 border-primary text-primary"
            : "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
        )}
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Advanced Filters
        {active && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
        )}
      </button>

      <AdvancedFiltersModal
        open={open}
        onClose={() => setOpen(false)}
        filters={filters}
        onApply={handleApply}
      />
    </div>
  );
}

export function AdvancedFiltersControl(props: AdvancedFiltersControlProps) {
  return (
    <SuspenseWrapper
      fallback={
        <div className="h-10 w-40 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
      }
    >
      <AdvancedFiltersControlContent {...props} />
    </SuspenseWrapper>
  );
}
