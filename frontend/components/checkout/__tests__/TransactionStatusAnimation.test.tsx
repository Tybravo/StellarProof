import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TransactionStatusAnimation from "../TransactionStatusAnimation";

describe("TransactionStatusAnimation", () => {
  it("renders success animation with proper accessibility label and elements", () => {
    render(<TransactionStatusAnimation status="success" />);
    const container = screen.getByTestId("transaction-animation-success");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-label", "Transaction succeeded");
  });

  it("renders error/failure animation with proper accessibility label and elements", () => {
    render(<TransactionStatusAnimation status="error" />);
    const container = screen.getByTestId("transaction-animation-error");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-label", "Transaction failed");
  });

  it("applies custom size and className when provided", () => {
    render(<TransactionStatusAnimation status="success" size={72} className="custom-class" />);
    const container = screen.getByTestId("transaction-animation-success");
    expect(container).toHaveClass("custom-class");
    expect(container).toHaveStyle({ width: "72px", height: "72px" });
  });
});
