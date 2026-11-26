import { renderHook, act } from "@testing-library/react";
import {
  useSearchFilters,
  parseSearchFiltersFromParams,
  searchFiltersToSearchParams,
  checkHasActiveFilters,
  DEFAULT_SEARCH_FILTERS,
} from "../useSearchFilters";

// Mock next/navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();
let mockPathname = "/search";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

describe("useSearchFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockPathname = "/search";
  });

  describe("parseSearchFiltersFromParams & searchFiltersToSearchParams helpers", () => {
    it("parses empty params to default filters", () => {
      const params = new URLSearchParams();
      const parsed = parseSearchFiltersFromParams(params);
      expect(parsed).toEqual(DEFAULT_SEARCH_FILTERS);
    });

    it("parses custom params accurately", () => {
      const params = new URLSearchParams(
        "q=stellar&filterFrom=2026-01-01&filterTo=2026-02-01&privacy=private&fileType=pdf&creator=GABC&status=verified"
      );
      const parsed = parseSearchFiltersFromParams(params);
      expect(parsed.query).toBe("stellar");
      expect(parsed.dateFrom).toBe("2026-01-01");
      expect(parsed.dateTo).toBe("2026-02-01");
      expect(parsed.privacyStatus).toBe("private");
      expect(parsed.fileType).toBe("pdf");
      expect(parsed.creator).toBe("GABC");
      expect(parsed.status).toBe("verified");
    });

    it("converts filters to search params omitting empty and default values", () => {
      const params = searchFiltersToSearchParams({
        query: "stellar",
        privacyStatus: "restricted",
      });
      expect(params.get("q")).toBe("stellar");
      expect(params.get("privacy")).toBe("restricted");
      expect(params.has("filterFrom")).toBe(false);
      expect(params.has("fileType")).toBe(false);
    });

    it("checkHasActiveFilters returns true only when non-default values exist", () => {
      expect(checkHasActiveFilters(DEFAULT_SEARCH_FILTERS)).toBe(false);
      expect(
        checkHasActiveFilters({ ...DEFAULT_SEARCH_FILTERS, query: "nft" })
      ).toBe(true);
      expect(
        checkHasActiveFilters({ ...DEFAULT_SEARCH_FILTERS, privacyStatus: "private" })
      ).toBe(true);
      expect(
        checkHasActiveFilters({ ...DEFAULT_SEARCH_FILTERS, fileType: "video" })
      ).toBe(true);
    });
  });

  describe("Hook behavior with router", () => {
    it("reads initial filter state from URL search params", () => {
      mockSearchParams = new URLSearchParams("q=crypto&privacy=private");
      const { result } = renderHook(() => useSearchFilters());

      expect(result.current.filters.query).toBe("crypto");
      expect(result.current.filters.privacyStatus).toBe("private");
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("updates URL when setFilter is called", () => {
      const { result } = renderHook(() => useSearchFilters());

      act(() => {
        result.current.setFilter("query", "stellar-network");
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/search?q=stellar-network", {
        scroll: false,
      });
    });

    it("updates multiple filters with setFilters", () => {
      const { result } = renderHook(() => useSearchFilters());

      act(() => {
        result.current.setFilters({
          query: "anchor",
          privacyStatus: "restricted",
          fileType: "image",
        });
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const url = mockReplace.mock.calls[0][0];
      expect(url).toContain("q=anchor");
      expect(url).toContain("privacy=restricted");
      expect(url).toContain("fileType=image");
    });

    it("resets filters back to clean URL when resetFilters is called", () => {
      mockSearchParams = new URLSearchParams("q=test&privacy=public&filterFrom=2026-01-01");
      const { result } = renderHook(() => useSearchFilters());

      act(() => {
        result.current.resetFilters();
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/search", { scroll: false });
    });

    it("clears individual filter with clearFilter", () => {
      mockSearchParams = new URLSearchParams("q=test&creator=GABC");
      const { result } = renderHook(() => useSearchFilters());

      act(() => {
        result.current.clearFilter("creator");
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/search?q=test", { scroll: false });
    });

    it("uses push instead of replace when historyMethod option is 'push'", () => {
      const { result } = renderHook(() =>
        useSearchFilters({ historyMethod: "push" })
      );

      act(() => {
        result.current.setFilter("query", "push-test");
      });

      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/search?q=push-test", {
        scroll: false,
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
