/**
 * Tests for the certificate search data-fetching hook.
 * Covers loading states, error handling, retry, and race-condition safety.
 * @see Issue #377
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCertificateSearch } from "./useCertificateSearch";
import { searchCertificates, SearchApiError } from "../services/searchService";
import type { CertificateSearchResult, SearchCertificate } from "../services/searchService";

jest.mock("../services/searchService", () => {
  const actual = jest.requireActual("../services/searchService");
  return { ...actual, searchCertificates: jest.fn() };
});

const mockedSearch = searchCertificates as jest.MockedFunction<typeof searchCertificates>;

function cert(id: string): SearchCertificate {
  return {
    id,
    certificateId: id,
    title: `Certificate ${id}`,
    creator: "GTEST",
    contentHash: `sha256:${id}`,
    manifestHash: `0x${id}`,
    network: "testnet",
    status: "verified",
    mintedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    tags: [],
  };
}

function result(ids: string[], overrides: Partial<CertificateSearchResult> = {}): CertificateSearchResult {
  return {
    results: ids.map(cert),
    total: ids.length,
    page: 1,
    limit: 12,
    totalPages: 1,
    source: "api",
    ...overrides,
  };
}

describe("useCertificateSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes a loading state while the first request is in flight", async () => {
    mockedSearch.mockResolvedValue(result(["A"]));

    const { result: hook } = renderHook(() =>
      useCertificateSearch({ query: "aurora", debounceMs: 0 })
    );

    // Before the debounce elapses / request settles, we are loading.
    expect(hook.current.isLoading).toBe(true);
    expect(hook.current.isFetching).toBe(true);
    expect(hook.current.data).toEqual([]);

    await waitFor(() => expect(hook.current.isLoading).toBe(false));

    expect(hook.current.data).toHaveLength(1);
    expect(hook.current.data[0].certificateId).toBe("A");
    expect(hook.current.total).toBe(1);
    expect(hook.current.error).toBeNull();
    expect(hook.current.hasSearched).toBe(true);
    expect(hook.current.isFetching).toBe(false);
  });

  it("passes the query and all filters through to the service", async () => {
    mockedSearch.mockResolvedValue(result([]));

    renderHook(() =>
      useCertificateSearch({
        query: "  hash-123  ",
        page: 3,
        limit: 10,
        status: "pending",
        network: "mainnet",
        sort: "oldest",
        debounceMs: 0,
      })
    );

    await waitFor(() => expect(mockedSearch).toHaveBeenCalled());

    expect(mockedSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "hash-123", // trimmed
        page: 3,
        limit: 10,
        status: "pending",
        network: "mainnet",
        sort: "oldest",
      })
    );
  });

  it("surfaces an error message and clears data when the API fails", async () => {
    mockedSearch.mockRejectedValue(new SearchApiError("API is down", { status: 503 }));

    const { result: hook } = renderHook(() =>
      useCertificateSearch({ query: "x", debounceMs: 0 })
    );

    await waitFor(() => expect(hook.current.error).toBe("API is down"));

    expect(hook.current.data).toEqual([]);
    expect(hook.current.isLoading).toBe(false);
    expect(hook.current.isFetching).toBe(false);
    expect(hook.current.hasSearched).toBe(true);
  });

  it("refetches when retry() is called after a failure", async () => {
    mockedSearch.mockRejectedValueOnce(new SearchApiError("Temporary failure"));

    const { result: hook } = renderHook(() =>
      useCertificateSearch({ query: "x", debounceMs: 0 })
    );

    await waitFor(() => expect(hook.current.error).toBe("Temporary failure"));

    mockedSearch.mockResolvedValueOnce(result(["B"]));
    act(() => hook.current.retry());

    await waitFor(() => expect(hook.current.error).toBeNull());
    expect(hook.current.data[0].certificateId).toBe("B");
    expect(mockedSearch).toHaveBeenCalledTimes(2);
  });

  it("ignores aborted requests instead of showing an error", async () => {
    mockedSearch.mockRejectedValue(
      new SearchApiError("Search request aborted", { isAbort: true })
    );

    const { result: hook } = renderHook(() =>
      useCertificateSearch({ query: "x", debounceMs: 0 })
    );

    await waitFor(() => expect(mockedSearch).toHaveBeenCalled());
    // Give any pending state updates a chance to flush.
    await act(async () => {
      await Promise.resolve();
    });

    expect(hook.current.error).toBeNull();
  });

  it("reports isEmpty when a completed search returns no rows", async () => {
    mockedSearch.mockResolvedValue(result([]));

    const { result: hook } = renderHook(() =>
      useCertificateSearch({ query: "no-match", debounceMs: 0 })
    );

    await waitFor(() => expect(hook.current.isEmpty).toBe(true));
    expect(hook.current.data).toEqual([]);
    expect(hook.current.error).toBeNull();
  });

  it("debounces rapid query changes into a single request", async () => {
    jest.useFakeTimers();
    // Never settles, so no post-timer state update escapes act().
    mockedSearch.mockImplementation(() => new Promise(() => {}));

    const { rerender } = renderHook(
      ({ q }: { q: string }) => useCertificateSearch({ query: q, debounceMs: 300 }),
      { initialProps: { q: "a" } }
    );

    rerender({ q: "au" });
    rerender({ q: "aur" });
    rerender({ q: "auro" });

    // Nothing dispatched while the user is still typing.
    expect(mockedSearch).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockedSearch).toHaveBeenCalledTimes(1);
    expect(mockedSearch).toHaveBeenCalledWith(expect.objectContaining({ query: "auro" }));

    jest.useRealTimers();
  });

  it("aborts the in-flight request when the consumer unmounts", async () => {
    let capturedSignal: AbortSignal | undefined;
    mockedSearch.mockImplementation((params) => {
      capturedSignal = params.signal;
      return new Promise(() => {}); // never settles
    });

    const { unmount } = renderHook(() =>
      useCertificateSearch({ query: "x", debounceMs: 0 })
    );

    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal!.aborted).toBe(false);

    unmount();
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("does not fetch while disabled", async () => {
    mockedSearch.mockResolvedValue(result(["A"]));

    renderHook(() => useCertificateSearch({ query: "x", debounceMs: 0, enabled: false }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedSearch).not.toHaveBeenCalled();
  });
});
