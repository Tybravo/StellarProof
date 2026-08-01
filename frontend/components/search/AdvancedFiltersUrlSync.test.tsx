import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AdvancedFiltersControl,
  advancedFiltersFromSearchParams,
  advancedFiltersToSearchParams,
  DEFAULT_ADVANCED_FILTERS,
} from "./AdvancedFiltersModal";

const replace = jest.fn();
let currentSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/vault",
  useSearchParams: () => currentSearchParams,
}));

describe("advanced filters <-> URL search params helpers", () => {
  it("omits default/empty values when serializing", () => {
    const params = advancedFiltersToSearchParams(DEFAULT_ADVANCED_FILTERS);
    expect(params.toString()).toBe("");
  });

  it("serializes only the non-default fields", () => {
    const params = advancedFiltersToSearchParams({
      dateFrom: "2026-01-01",
      dateTo: "2026-02-01",
      privacyStatus: "private",
      fileType: "pdf",
      creator: "GABCD1234",
    });
    expect(params.get("filterFrom")).toBe("2026-01-01");
    expect(params.get("filterTo")).toBe("2026-02-01");
    expect(params.get("privacy")).toBe("private");
    expect(params.get("fileType")).toBe("pdf");
    expect(params.get("creator")).toBe("GABCD1234");
  });

  it("parses filters back out of search params", () => {
    const params = new URLSearchParams(
      "filterFrom=2026-01-01&filterTo=2026-02-01&privacy=private&fileType=pdf&creator=GABCD1234"
    );
    expect(advancedFiltersFromSearchParams(params)).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-02-01",
      privacyStatus: "private",
      fileType: "pdf",
      creator: "GABCD1234",
    });
  });

  it("falls back to defaults for missing or invalid values", () => {
    const params = new URLSearchParams("privacy=not-a-real-status");
    expect(advancedFiltersFromSearchParams(params)).toEqual(
      DEFAULT_ADVANCED_FILTERS
    );
  });

  it("round-trips through serialize -> parse", () => {
    const original = {
      dateFrom: "2026-03-01",
      dateTo: "",
      privacyStatus: "restricted" as const,
      fileType: "archive" as const,
      creator: "  GXYZ  ",
    };
    const roundTripped = advancedFiltersFromSearchParams(
      advancedFiltersToSearchParams(original)
    );
    expect(roundTripped).toEqual({ ...original, creator: "GXYZ" });
  });
});

describe("AdvancedFiltersControl", () => {
  beforeEach(() => {
    replace.mockClear();
    currentSearchParams = new URLSearchParams();
  });

  it("reads initial filter state from the URL search params", () => {
    currentSearchParams = new URLSearchParams("privacy=public&creator=GABCD1234");
    render(<AdvancedFiltersControl />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    expect(screen.getByLabelText(/creator/i)).toHaveValue("GABCD1234");
    expect(screen.getByRole("button", { name: "Public" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("updates the URL via router.replace when filters are applied", () => {
    render(<AdvancedFiltersControl />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GNEWCREATOR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(replace).toHaveBeenCalledWith(
      "/vault?creator=GNEWCREATOR",
      { scroll: false }
    );
  });

  it("navigates back to the bare pathname when all filters are cleared", () => {
    currentSearchParams = new URLSearchParams("creator=GABCD1234");
    render(<AdvancedFiltersControl />);

    fireEvent.click(screen.getByRole("button", { name: /advanced filters/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(replace).toHaveBeenCalledWith("/vault", { scroll: false });
  });
});
