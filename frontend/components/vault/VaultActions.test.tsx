import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VaultActions } from "./VaultActions";
import { ToastProvider } from "@/context/ToastContext";

// Mock the ToastProvider and useToast
jest.mock("@/context/ToastContext", () => ({
  ...jest.requireActual("@/context/ToastContext"),
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

const mockItem = {
  id: "1",
  storageId: "SPV-123",
  filename: "test-file.pdf",
  size: 1024,
};

describe("VaultActions", () => {
  it("renders download button", () => {
    render(
      <ToastProvider>
        <VaultActions item={mockItem} />
      </ToastProvider>
    );
    expect(screen.getByLabelText(/download encrypted/i)).toBeInTheDocument();
  });

  it("opens confirmation modal when download button is clicked", () => {
    render(
      <ToastProvider>
        <VaultActions item={mockItem} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByLabelText(/download encrypted/i));
    expect(screen.getByText(/confirm backup/i)).toBeInTheDocument();
    expect(screen.getByText(/test-file.pdf.enc/i)).toBeInTheDocument();
  });
});
