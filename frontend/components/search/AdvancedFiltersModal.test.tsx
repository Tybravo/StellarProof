import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AdvancedFiltersModal,
  DEFAULT_ADVANCED_FILTERS,
  type AdvancedFilters,
} from "./AdvancedFiltersModal";

function renderModal(overrides?: {
  open?: boolean;
  filters?: AdvancedFilters;
  onClose?: () => void;
  onApply?: (filters: AdvancedFilters) => void;
}) {
  const onClose = overrides?.onClose ?? jest.fn();
  const onApply = overrides?.onApply ?? jest.fn();
  const utils = render(
    <AdvancedFiltersModal
      open={overrides?.open ?? true}
      onClose={onClose}
      filters={overrides?.filters ?? DEFAULT_ADVANCED_FILTERS}
      onApply={onApply}
    />
  );
  return { ...utils, onClose, onApply };
}

describe("AdvancedFiltersModal", () => {
  it("does not render dialog content when closed", () => {
    renderModal({ open: false });
    expect(screen.queryByText(/advanced filters/i)).not.toBeInTheDocument();
  });

  it("renders all required form inputs when open", () => {
    renderModal();
    expect(screen.getByText(/advanced filters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date to/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /spv privacy status/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/file type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/creator/i)).toBeInTheDocument();
  });

  it("captures form input changes in local state", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/date from/i), {
      target: { value: "2026-01-01" },
    });
    expect(screen.getByLabelText(/date from/i)).toHaveValue("2026-01-01");

    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    expect(screen.getByRole("button", { name: "Private" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.change(screen.getByLabelText(/file type/i), {
      target: { value: "pdf" },
    });
    expect(screen.getByLabelText(/file type/i)).toHaveValue("pdf");

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });
    expect(screen.getByLabelText(/creator/i)).toHaveValue("GABCD1234");
  });

  it("calls onApply with the current draft and closes on Apply", () => {
    const { onApply, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "GABCD1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ creator: "GABCD1234" })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("discards draft changes and calls onClose on Cancel", () => {
    const { onApply, onClose } = renderModal();

    fireEvent.change(screen.getByLabelText(/creator/i), {
      target: { value: "unsaved" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("resets the draft to defaults when Reset is clicked", () => {
    renderModal({
      filters: { ...DEFAULT_ADVANCED_FILTERS, creator: "GABCD1234" },
    });

    expect(screen.getByLabelText(/creator/i)).toHaveValue("GABCD1234");
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.getByLabelText(/creator/i)).toHaveValue("");
  });
});
