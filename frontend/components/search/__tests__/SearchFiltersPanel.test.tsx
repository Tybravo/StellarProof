import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchFiltersPanel } from "../SearchFiltersPanel";

describe("SearchFiltersPanel", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onApply: jest.fn(),
    onReset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render dialog content when isOpen is false", () => {
    render(<SearchFiltersPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders slide-out panel with header, inputs, and action buttons when isOpen is true", () => {
    render(<SearchFiltersPanel {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Search Filters")).toBeInTheDocument();
    expect(screen.getByLabelText(/date from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/file type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/creator/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply filters/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("seeds inputs from provided filters prop", () => {
    render(
      <SearchFiltersPanel
        {...defaultProps}
        filters={{
          dateFrom: "2026-03-01",
          dateTo: "2026-03-15",
          privacyStatus: "private",
          fileType: "pdf",
          creator: "GA123456",
        }}
      />
    );

    expect(screen.getByLabelText(/date from/i)).toHaveValue("2026-03-01");
    expect(screen.getByLabelText(/date to/i)).toHaveValue("2026-03-15");
    expect(screen.getByLabelText(/file type/i)).toHaveValue("pdf");
    expect(screen.getByLabelText(/creator/i)).toHaveValue("GA123456");

    const privateBtn = screen.getByRole("button", { name: /private/i });
    expect(privateBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("updates date range inputs correctly", () => {
    render(<SearchFiltersPanel {...defaultProps} />);

    const fromInput = screen.getByLabelText(/date from/i);
    const toInput = screen.getByLabelText(/date to/i);

    fireEvent.change(fromInput, { target: { value: "2026-05-01" } });
    expect(fromInput).toHaveValue("2026-05-01");

    fireEvent.change(toInput, { target: { value: "2026-05-10" } });
    expect(toInput).toHaveValue("2026-05-10");
  });

  it("displays validation warning if dateFrom is after dateTo and disables apply", () => {
    render(<SearchFiltersPanel {...defaultProps} />);

    const fromInput = screen.getByLabelText(/date from/i);
    const toInput = screen.getByLabelText(/date to/i);

    fireEvent.change(fromInput, { target: { value: "2026-05-20" } });
    fireEvent.change(toInput, { target: { value: "2026-05-10" } });

    expect(screen.getByText(/start date cannot be after end date/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply filters/i })).toBeDisabled();
  });

  it("updates privacy selection when clicking privacy buttons", () => {
    render(<SearchFiltersPanel {...defaultProps} />);

    const restrictedBtn = screen.getByRole("button", { name: /^restricted/i });
    fireEvent.click(restrictedBtn);

    expect(restrictedBtn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/filtering by restricted spv records only/i)).toBeInTheDocument();
  });

  it("updates file type select dropdown", () => {
    render(<SearchFiltersPanel {...defaultProps} />);

    const select = screen.getByLabelText(/file type/i);
    fireEvent.change(select, { target: { value: "video" } });

    expect(select).toHaveValue("video");
  });

  it("calls onApply with updated draft values and closes panel on Apply", () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    render(
      <SearchFiltersPanel
        {...defaultProps}
        onApply={onApply}
        onClose={onClose}
      />
    );

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GCREATOR999" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        creator: "GCREATOR999",
      })
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancel or X button is clicked", () => {
    const onClose = jest.fn();
    render(<SearchFiltersPanel {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /close filters panel/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("calls onClose on Escape key press", () => {
    const onClose = jest.fn();
    render(<SearchFiltersPanel {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resets inputs when Reset button is clicked", () => {
    const onReset = jest.fn();
    render(
      <SearchFiltersPanel
        {...defaultProps}
        filters={{ creator: "GINITIAL" }}
        onReset={onReset}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/creator/i)).toHaveValue("");
  });
});
