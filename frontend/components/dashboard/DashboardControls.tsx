"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, Search, X } from "lucide-react";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*                              Types                                  */
/* ------------------------------------------------------------------ */

export type VerificationStatus =
  | "all"
  | "pending"
  | "verified"
  | "rejected"
  | "failed";

export interface DashboardFilters {
  query: string;
  statuses: VerificationStatus[];
  dateFrom: string;
  dateTo: string;
}

export interface DashboardControlsProps {
  /** Called whenever any filter changes */
  onChange?: (filters: DashboardFilters) => void;
  /** Optional CSS class name */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*                           Constants                                 */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: { value: VerificationStatus; label: string; color: string }[] =
  [
    { value: "all", label: "All", color: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600" },
    { value: "pending", label: "Pending", color: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700" },
    { value: "verified", label: "Verified", color: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700" },
    { value: "rejected", label: "Rejected", color: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700" },
    { value: "failed", label: "Failed", color: "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700" },
  ];

const EMPTY_FILTERS: DashboardFilters = {
  query: "",
  statuses: ["all"],
  dateFrom: "",
  dateTo: "",
};

/* ------------------------------------------------------------------ */
/*                           URL helpers                               */
/* ------------------------------------------------------------------ */

function filtersToParams(f: DashboardFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.query) p.set("q", f.query);
  const statuses = f.statuses.filter((s) => s !== "all");
  if (statuses.length) p.set("status", statuses.join(","));
  if (f.dateFrom) p.set("from", f.dateFrom);
  if (f.dateTo) p.set("to", f.dateTo);
  return p;
}

function paramsToFilters(p: URLSearchParams): DashboardFilters {
  const rawStatuses = p.get("status");
  const statuses: VerificationStatus[] = rawStatuses
    ? (rawStatuses.split(",") as VerificationStatus[]).filter((s) =>
        ["pending", "verified", "rejected", "failed"].includes(s)
      )
    : [];
  return {
    query: p.get("q") ?? "",
    statuses: statuses.length ? statuses : ["all"],
    dateFrom: p.get("from") ?? "",
    dateTo: p.get("to") ?? "",
  };
}

function hasActiveFilters(f: DashboardFilters): boolean {
  return (
    f.query !== "" ||
    !f.statuses.includes("all") ||
    f.dateFrom !== "" ||
    f.dateTo !== ""
  );
}

/* ------------------------------------------------------------------ */
/*                        Sub-components                               */
/* ------------------------------------------------------------------ */

interface StatusChipProps {
  option: (typeof STATUS_OPTIONS)[number];
  selected: boolean;
  onToggle: (value: VerificationStatus) => void;
}

function StatusChip({ option, selected, onToggle }: StatusChipProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(option.value)}
      aria-pressed={selected}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 select-none",
        option.color,
        selected
          ? "ring-2 ring-primary ring-offset-1 ring-offset-white dark:ring-offset-gray-900 opacity-100"
          : "opacity-60 hover:opacity-90"
      )}
    >
      {option.label}
    </button>
  );
}

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  max?: string;
  min?: string;
  onChange: (v: string) => void;
}

function DateField({ id, label, value, max, min, onChange }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs text-gray-500 dark:text-gray-400 font-medium"
      >
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
            "pl-8 pr-3 py-2 text-xs rounded-lg border w-full",
            "bg-white dark:bg-darkblue-dark",
            "text-gray-800 dark:text-gray-100",
            "border-gray-300 dark:border-gray-600",
            "focus:outline-none focus:ring-2 focus:ring-primary/60",
            "transition-colors"
          )}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                         Main Component                              */
/* ------------------------------------------------------------------ */

export default function DashboardControls({
  onChange,
  className,
}: DashboardControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<DashboardFilters>(() =>
    paramsToFilters(searchParams)
  );

  // Debounce URL push for search input
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUrl = useCallback(
    (next: DashboardFilters) => {
      const params = filtersToParams(next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const applyFilters = useCallback(
    (next: DashboardFilters, debounce = false) => {
      setFilters(next);
      onChange?.(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (debounce) {
        debounceRef.current = setTimeout(() => pushUrl(next), 300);
      } else {
        pushUrl(next);
      }
    },
    [onChange, pushUrl]
  );

  // Sync from external URL changes (e.g. back/forward navigation)
  useEffect(() => {
    const next = paramsToFilters(searchParams);
    setFilters(next);
    onChange?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyFilters({ ...filters, query: e.target.value }, true);
  };

  const handleStatusToggle = (value: VerificationStatus) => {
    let next: VerificationStatus[];
    if (value === "all") {
      next = ["all"];
    } else {
      const without = filters.statuses.filter((s) => s !== "all" && s !== value);
      const adding = !filters.statuses.includes(value);
      next = adding ? [...without, value] : without;
      if (next.length === 0) next = ["all"];
    }
    applyFilters({ ...filters, statuses: next });
  };

  const handleDateFrom = (v: string) =>
    applyFilters({ ...filters, dateFrom: v });

  const handleDateTo = (v: string) =>
    applyFilters({ ...filters, dateTo: v });

  const handleClear = () => applyFilters({ ...EMPTY_FILTERS });

  const active = hasActiveFilters(filters);

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-900/60 p-4 space-y-4",
        className
      )}
      role="search"
      aria-label="Dashboard filters"
    >
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filters.query}
          onChange={handleQueryChange}
          placeholder="Search by Content Hash or Request ID…"
          aria-label="Search"
          className={cn(
            "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border",
            "bg-white dark:bg-darkblue-dark",
            "text-gray-800 dark:text-gray-100",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "border-gray-300 dark:border-gray-600",
            "focus:outline-none focus:ring-2 focus:ring-primary/60",
            "transition-colors"
          )}
        />
        {filters.query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => applyFilters({ ...filters, query: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
        {STATUS_OPTIONS.map((opt) => (
          <StatusChip
            key={opt.value}
            option={opt}
            selected={filters.statuses.includes(opt.value)}
            onToggle={handleStatusToggle}
          />
        ))}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <DateField
          id="filter-date-from"
          label="From"
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          onChange={handleDateFrom}
        />
        <DateField
          id="filter-date-to"
          label="To"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          onChange={handleDateTo}
        />
      </div>

      {/* Active filter indicators + clear */}
      {active && (
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap gap-1.5">
            {filters.query && (
              <ActiveBadge label={`"${filters.query}"`} onRemove={() => applyFilters({ ...filters, query: "" })} />
            )}
            {filters.statuses
              .filter((s) => s !== "all")
              .map((s) => (
                <ActiveBadge
                  key={s}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                  onRemove={() => handleStatusToggle(s)}
                />
              ))}
            {filters.dateFrom && (
              <ActiveBadge label={`From ${filters.dateFrom}`} onRemove={() => applyFilters({ ...filters, dateFrom: "" })} />
            )}
            {filters.dateTo && (
              <ActiveBadge label={`To ${filters.dateTo}`} onRemove={() => applyFilters({ ...filters, dateTo: "" })} />
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-primary hover:text-primary-dark font-medium transition-colors shrink-0 ml-2"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                        ActiveBadge                                  */
/* ------------------------------------------------------------------ */

function ActiveBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="hover:text-primary-dark transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
