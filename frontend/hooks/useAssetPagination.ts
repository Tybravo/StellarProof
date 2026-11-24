"use client";

import { useEffect, useEffectEvent, useState } from "react";

// Internal frontend contract. A service adapter can map the eventual API to it.
export interface PaginationRequest {
  skip: number;
  limit: number;
  signal: AbortSignal;
}

export type PaginatedResult<T> = { items: T[] } & (
  | { total: number; hasNext?: never }
  | { total?: never; hasNext: boolean }
);

type RequestState<T> =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "success"; data: PaginatedResult<T> };

/** Change filterKey whenever the dataset or filters change. Requests use the latest fetcher. */
export function useAssetPagination<T>(
  fetchPage: (request: PaginationRequest) => Promise<PaginatedResult<T>>,
  pageSize: number,
  filterKey = "",
) {
  const [position, setPosition] = useState({ page: 1, pageSize, filterKey });
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    position: typeof position;
    attempt: number;
    state: RequestState<T>;
  }>();
  const changed = !Object.is(position.pageSize, pageSize) || position.filterKey !== filterKey;
  if (changed) setPosition({ page: 1, pageSize, filterKey });

  const page = changed ? 1 : position.page;
  const skip = (page - 1) * pageSize;
  const invalidRequest = !Number.isSafeInteger(pageSize) || pageSize < 1 ||
    !Number.isSafeInteger(skip);
  const requestPage = useEffectEvent(fetchPage);

  useEffect(() => {
    if (invalidRequest) return;
    const controller = new AbortController();
    async function load() {
      try {
        const data = await requestPage({ skip, limit: pageSize, signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!isValidPage(data)) throw new Error("Invalid pagination response.");
        const lastPage = data.total === undefined ? undefined : Math.ceil(data.total / pageSize);
        if (lastPage !== undefined && page > Math.max(1, lastPage)) {
          setPosition({ ...position, page: Math.max(1, lastPage) });
          return;
        }
        setResponse({ position, attempt, state: { status: "success", data } });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResponse({ position, attempt, state: { status: "error", error } });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [position, attempt, skip, pageSize, page, invalidRequest]);

  const state: RequestState<T> = invalidRequest
    ? { status: "error", error: new RangeError("Invalid page size or pagination offset.") }
    : !changed && response?.position === position && response.attempt === attempt
    ? response.state
    : { status: "loading" as const };
  const data = state.status === "success" ? state.data : undefined;
  const totalPages = data?.total === undefined ? undefined : Math.ceil(data.total / pageSize);
  const hasNext = Number.isSafeInteger(page + 1) && Number.isSafeInteger(page * pageSize) &&
    (totalPages === undefined ? data?.hasNext === true : page < totalPages);

  function onPage(next: number) {
    if (state.status === "loading" || next < 1) return;
    if (next === page - 1 || (next === page + 1 && hasNext)) {
      setPosition({ ...position, page: next });
    }
  }

  function retry() {
    if (!invalidRequest && state.status === "error") setAttempt(attempt + 1);
  }

  return { page, pageSize, skip, totalPages, hasNext, state, onPage, retry };
}

function isValidPage<T>(data: PaginatedResult<T>): boolean {
  if (!data || !Array.isArray(data.items)) return false;
  if (data.total !== undefined) {
    return Number.isSafeInteger(data.total) && data.total >= 0 && data.hasNext === undefined;
  }
  return typeof data.hasNext === "boolean";
}
