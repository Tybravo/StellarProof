import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAssetPagination, type PaginationRequest, type PaginatedResult } from "./useAssetPagination";

test("calculates offsets, guards navigation and resets for page size and filters", async () => {
  const fetchPage = jest.fn(async ({ skip }: PaginationRequest) => ({
    items: [skip],
    hasNext: skip < 10,
  }));
  const { result, rerender } = renderHook(
    ({ size, filter }) => useAssetPagination(fetchPage, size, filter),
    { initialProps: { size: 10, filter: "" } },
  );
  expect(result.current.state.status).toBe("loading");
  act(() => result.current.onPage(2));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => {
    result.current.onPage(0);
    result.current.onPage(3);
    result.current.onPage(1.5);
  });
  expect(fetchPage).toHaveBeenCalledTimes(1);

  async function goTo(page: number, skip: number, limit: number) {
    act(() => result.current.onPage(page));
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.page).toBe(page);
    expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ skip, limit }));
  }

  await goTo(2, 10, 10);
  expect(result.current.hasNext).toBe(false);
  act(() => result.current.onPage(3));
  expect(result.current.page).toBe(2);
  await goTo(1, 0, 10);
  await goTo(2, 10, 10);

  rerender({ size: 20, filter: "" });
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(result.current.page).toBe(1);
  expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0, limit: 20 }));
  await goTo(2, 20, 20);

  rerender({ size: 20, filter: "image" });
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(result.current.page).toBe(1);
  expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 0, limit: 20 }));
});

test("aborts obsolete requests and ignores late results even when the fetcher ignores cancellation", async () => {
  const pending: {
    signal: AbortSignal;
    resolve: (value: PaginatedResult<string>) => void;
  }[] = [];
  const fetchPage = ({ signal }: PaginationRequest) =>
    new Promise<PaginatedResult<string>>((resolve) => pending.push({ signal, resolve }));
  const { result, rerender, unmount } = renderHook(
    ({ filter }) => useAssetPagination(fetchPage, 10, filter),
    { initialProps: { filter: "old" } },
  );
  rerender({ filter: "new" });
  expect(pending[0].signal.aborted).toBe(true);
  await act(async () => pending[1].resolve({ items: ["new"], total: 1 }));
  await act(async () => pending[0].resolve({ items: ["old"], total: 1 }));
  expect(result.current.state).toEqual({ status: "success", data: { items: ["new"], total: 1 } });
  unmount();
  expect(pending[1].signal.aborted).toBe(true);
});

test("clamps and refetches when the total drops on a later page", async () => {
  const fetchPage = jest.fn(async ({ skip }: PaginationRequest) =>
    skip === 0 ? { items: [1], total: 11 } : { items: [], total: 1 },
  );
  const { result } = renderHook(() => useAssetPagination(fetchPage, 10));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  act(() => result.current.onPage(2));
  await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(3));
  expect(result.current.page).toBe(1);
  expect(fetchPage.mock.calls.map(([request]) => request.skip)).toEqual([0, 10, 0]);
});

test.each([
  { total: -1 }, { total: 1.5 }, { total: NaN }, { total: Infinity },
  { total: Number.MAX_SAFE_INTEGER + 1 }, {}, { hasNext: "false" },
  { total: 21, hasNext: false }, { total: 10, hasNext: true },
])("rejects malformed metadata %#", async (metadata) => {
  const fetchPage = async () => ({ items: [1], ...metadata }) as PaginatedResult<number>;
  const { result } = renderHook(() => useAssetPagination(fetchPage, 10));
  await waitFor(() => expect(result.current.state.status).toBe("error"));
  expect(result.current.hasNext).toBe(false);
  expect(result.current.totalPages).toBeUndefined();
});

test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
  "reports invalid page size %s without calling the fetcher", (size) => {
    const fetchPage = jest.fn();
    const { result } = renderHook(() => useAssetPagination(fetchPage, size));
    expect(result.current.state.status).toBe("error");
    act(() => result.current.retry());
    expect(fetchPage).not.toHaveBeenCalled();
  },
);

test("blocks navigation when the next offset would exceed the safe integer range", async () => {
  const fetchPage = jest.fn(async ({ skip }: PaginationRequest) => ({ items: [skip], hasNext: true }));
  const size = Number.MAX_SAFE_INTEGER;
  const { result } = renderHook(() => useAssetPagination(fetchPage, size));
  await waitFor(() => expect(result.current.hasNext).toBe(true));
  act(() => result.current.onPage(2));
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  expect(result.current.skip).toBe(size);
  expect(result.current.hasNext).toBe(false);
  act(() => result.current.onPage(3));
  expect(fetchPage.mock.calls.map(([request]) => request.skip)).toEqual([0, size]);
});

test("uses the latest inline fetcher without refetching until navigation or a dataset change", async () => {
  const fetchPage = jest.fn(async (source: string, { skip }: PaginationRequest) => ({
    items: [source + skip], hasNext: true,
  }));
  const { result, rerender } = renderHook(
    ({ source, key }) => useAssetPagination((request) => fetchPage(source, request), 10, key),
    { initialProps: { source: "first", key: "dataset-a" } },
  );
  await waitFor(() => expect(result.current.state.status).toBe("success"));
  rerender({ source: "new callback", key: "dataset-a" });
  expect(fetchPage).toHaveBeenCalledTimes(1);
  act(() => result.current.onPage(2));
  await waitFor(() => expect(result.current.state).toMatchObject({ data: { items: ["new callback10"] } }));
  rerender({ source: "second dataset", key: "dataset-b" });
  await waitFor(() => expect(result.current.state).toMatchObject({ data: { items: ["second dataset0"] } }));
  expect(result.current.page).toBe(1);
  expect(fetchPage).toHaveBeenCalledTimes(3);
});

test("ignores Strict Mode replay and aborts a separate pending request on unmount", async () => {
  const pending: {
    signal: AbortSignal;
    resolve: (value: PaginatedResult<string>) => void;
    reject: (error: Error) => void;
  }[] = [];
  const fetchPage = ({ signal }: PaginationRequest) =>
    new Promise<PaginatedResult<string>>((resolve, reject) => pending.push({ signal, resolve, reject }));
  const { result, unmount } = renderHook(() => useAssetPagination(fetchPage, 10), { wrapper: StrictMode });

  expect(pending).toHaveLength(2);
  expect(pending[0].signal.aborted).toBe(true);
  expect(pending[1].signal.aborted).toBe(false);
  await act(async () => pending[1].resolve({ items: ["active"], hasNext: true }));
  await act(async () => pending[0].reject(new Error("obsolete request")));
  expect(result.current.state).toMatchObject({ data: { items: ["active"] } });

  act(() => result.current.onPage(2));
  expect(pending).toHaveLength(3);
  expect(pending[2].signal.aborted).toBe(false);
  unmount();
  expect(pending[2].signal.aborted).toBe(true);
  await act(async () => pending[2].reject(new Error("unmounted request")));
});
