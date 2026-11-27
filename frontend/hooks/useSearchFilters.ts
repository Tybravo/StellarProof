"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type SpvPrivacyStatus = "all" | "public" | "private" | "restricted";

export type SearchFileType =
  | "all"
  | "pdf"
  | "image"
  | "video"
  | "document"
  | "archive"
  | "other";

export interface SearchFilters {
  query: string;
  dateFrom: string;
  dateTo: string;
  privacyStatus: SpvPrivacyStatus;
  fileType: SearchFileType;
  creator: string;
  status: string;
  [key: string]: string | undefined;
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: "",
  dateFrom: "",
  dateTo: "",
  privacyStatus: "all",
  fileType: "all",
  creator: "",
  status: "all",
};

export const SEARCH_PARAM_KEYS: Record<keyof Omit<SearchFilters, "[key: string]">, string> = {
  query: "q",
  dateFrom: "filterFrom",
  dateTo: "filterTo",
  privacyStatus: "privacy",
  fileType: "fileType",
  creator: "creator",
  status: "status",
};

export interface UseSearchFiltersOptions {
  historyMethod?: "replace" | "push";
  scroll?: boolean;
  defaultFilters?: Partial<SearchFilters>;
}

export interface UseSearchFiltersReturn {
  filters: SearchFilters;
  setFilter: <K extends keyof SearchFilters | string>(
    key: K,
    value: string | undefined | null
  ) => void;
  setFilters: (
    updates:
      | Partial<SearchFilters>
      | ((prev: SearchFilters) => Partial<SearchFilters>)
  ) => void;
  clearFilter: (key: keyof SearchFilters | string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  isPending: boolean;
  searchParams: URLSearchParams;
}

export function parseSearchFiltersFromParams(
  params: URLSearchParams,
  defaults: SearchFilters = DEFAULT_SEARCH_FILTERS
): SearchFilters {
  const query = params.get(SEARCH_PARAM_KEYS.query) ?? params.get("query") ?? defaults.query;
  const dateFrom = params.get(SEARCH_PARAM_KEYS.dateFrom) ?? params.get("dateFrom") ?? defaults.dateFrom;
  const dateTo = params.get(SEARCH_PARAM_KEYS.dateTo) ?? params.get("dateTo") ?? defaults.dateTo;
  const privacyRaw = params.get(SEARCH_PARAM_KEYS.privacyStatus) ?? params.get("privacyStatus") ?? defaults.privacyStatus;
  const fileTypeRaw = params.get(SEARCH_PARAM_KEYS.fileType) ?? defaults.fileType;
  const creator = params.get(SEARCH_PARAM_KEYS.creator) ?? defaults.creator;
  const status = params.get(SEARCH_PARAM_KEYS.status) ?? defaults.status;

  const validPrivacy: SpvPrivacyStatus[] = ["all", "public", "private", "restricted"];
  const validFileTypes: SearchFileType[] = [
    "all",
    "pdf",
    "image",
    "video",
    "document",
    "archive",
    "other",
  ];

  return {
    ...defaults,
    query: query.trim(),
    dateFrom,
    dateTo,
    privacyStatus: validPrivacy.includes(privacyRaw as SpvPrivacyStatus)
      ? (privacyRaw as SpvPrivacyStatus)
      : defaults.privacyStatus,
    fileType: validFileTypes.includes(fileTypeRaw as SearchFileType)
      ? (fileTypeRaw as SearchFileType)
      : defaults.fileType,
    creator: creator.trim(),
    status: status.trim() || defaults.status,
  };
}

export function searchFiltersToSearchParams(
  filters: Partial<SearchFilters>,
  baseParams: URLSearchParams = new URLSearchParams()
): URLSearchParams {
  const next = new URLSearchParams(baseParams.toString());

  // Helper to set or delete param
  const updateParam = (key: string, val: string | undefined | null, defaultVal?: string) => {
    const trimmed = (val ?? "").trim();
    if (trimmed && trimmed !== (defaultVal ?? "")) {
      next.set(key, trimmed);
    } else {
      next.delete(key);
    }
  };

  if ("query" in filters) updateParam(SEARCH_PARAM_KEYS.query, filters.query, "");
  if ("dateFrom" in filters) updateParam(SEARCH_PARAM_KEYS.dateFrom, filters.dateFrom, "");
  if ("dateTo" in filters) updateParam(SEARCH_PARAM_KEYS.dateTo, filters.dateTo, "");
  if ("privacyStatus" in filters)
    updateParam(SEARCH_PARAM_KEYS.privacyStatus, filters.privacyStatus, "all");
  if ("fileType" in filters)
    updateParam(SEARCH_PARAM_KEYS.fileType, filters.fileType, "all");
  if ("creator" in filters) updateParam(SEARCH_PARAM_KEYS.creator, filters.creator, "");
  if ("status" in filters) updateParam(SEARCH_PARAM_KEYS.status, filters.status, "all");

  // Handle any additional custom keys
  for (const [key, value] of Object.entries(filters)) {
    if (key in SEARCH_PARAM_KEYS) continue;
    const trimmed = (value ?? "").trim();
    if (trimmed) {
      next.set(key, trimmed);
    } else {
      next.delete(key);
    }
  }

  return next;
}

export function checkHasActiveFilters(
  filters: SearchFilters,
  defaults: SearchFilters = DEFAULT_SEARCH_FILTERS
): boolean {
  return (
    filters.query !== defaults.query ||
    filters.dateFrom !== defaults.dateFrom ||
    filters.dateTo !== defaults.dateTo ||
    filters.privacyStatus !== defaults.privacyStatus ||
    filters.fileType !== defaults.fileType ||
    filters.creator !== defaults.creator ||
    filters.status !== defaults.status
  );
}

/**
 * Custom hook to sync search filters with Next.js URL SearchParams.
 * Ensures search queries and applied filters are shareable, persistent across
 * reloads, and integrated with browser navigation history.
 */
export function useSearchFilters(
  options: UseSearchFiltersOptions = {}
): UseSearchFiltersReturn {
  const router = useRouter();
  const pathname = usePathname() || "";
  const rawSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const defaults = useMemo(
    () => ({
      ...DEFAULT_SEARCH_FILTERS,
      ...options.defaultFilters,
    }),
    [options.defaultFilters]
  );

  const currentSearchParams = useMemo(() => {
    return rawSearchParams
      ? new URLSearchParams(rawSearchParams.toString())
      : new URLSearchParams();
  }, [rawSearchParams]);

  const filters = useMemo(() => {
    return parseSearchFiltersFromParams(currentSearchParams, defaults);
  }, [currentSearchParams, defaults]);

  const updateUrl = useCallback(
    (nextParams: URLSearchParams) => {
      const queryString = nextParams.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      const historyMethod = options.historyMethod || "replace";
      const scroll = options.scroll ?? false;

      startTransition(() => {
        if (historyMethod === "push") {
          router.push(nextUrl, { scroll });
        } else {
          router.replace(nextUrl, { scroll });
        }
      });
    },
    [pathname, router, options.historyMethod, options.scroll]
  );

  const setFilter = useCallback(
    <K extends keyof SearchFilters | string>(
      key: K,
      value: string | undefined | null
    ) => {
      const nextParams = new URLSearchParams(currentSearchParams.toString());
      const paramKey =
        key in SEARCH_PARAM_KEYS
          ? SEARCH_PARAM_KEYS[key as keyof typeof SEARCH_PARAM_KEYS]
          : String(key);

      const trimmed = (value ?? "").trim();
      const defaultVal =
        key in defaults ? defaults[key as keyof typeof defaults] : "";

      if (trimmed && trimmed !== defaultVal) {
        nextParams.set(String(paramKey), trimmed);
      } else {
        nextParams.delete(String(paramKey));
        // Also remove legacy aliases if any
        if (key === "query") nextParams.delete("query");
        if (key === "dateFrom") nextParams.delete("dateFrom");
        if (key === "dateTo") nextParams.delete("dateTo");
        if (key === "privacyStatus") nextParams.delete("privacyStatus");
      }

      updateUrl(nextParams);
    },
    [currentSearchParams, defaults, updateUrl]
  );

  const setFilters = useCallback(
    (
      updates:
        | Partial<SearchFilters>
        | ((prev: SearchFilters) => Partial<SearchFilters>)
    ) => {
      const resolvedUpdates =
        typeof updates === "function" ? updates(filters) : updates;
      const nextParams = searchFiltersToSearchParams(
        resolvedUpdates,
        currentSearchParams
      );
      updateUrl(nextParams);
    },
    [filters, currentSearchParams, updateUrl]
  );

  const clearFilter = useCallback(
    (key: keyof SearchFilters | string) => {
      setFilter(key, "");
    },
    [setFilter]
  );

  const resetFilters = useCallback(() => {
    const nextParams = new URLSearchParams(currentSearchParams.toString());
    // Remove all managed filter keys
    Object.values(SEARCH_PARAM_KEYS).forEach((paramKey) => {
      nextParams.delete(paramKey);
    });
    // Remove aliases
    nextParams.delete("query");
    nextParams.delete("dateFrom");
    nextParams.delete("dateTo");
    nextParams.delete("privacyStatus");

    updateUrl(nextParams);
  }, [currentSearchParams, updateUrl]);

  const hasActiveFilters = useMemo(() => {
    return checkHasActiveFilters(filters, defaults);
  }, [filters, defaults]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilter,
    resetFilters,
    hasActiveFilters,
    isPending,
    searchParams: currentSearchParams,
  };
}

export default useSearchFilters;
