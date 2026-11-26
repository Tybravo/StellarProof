import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import XLMCheckoutModal from "../XLMCheckoutModal";
import * as freighter from "@stellar/freighter-api";
import { Horizon, Account } from "@stellar/stellar-sdk";

const mockAddToast = jest.fn();

jest.mock("@/context/ToastContext", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

jest.mock("@stellar/freighter-api", () => ({
  requestAccess: jest.fn(),
  signTransaction: jest.fn(),
}));

const VALID_ACCOUNT = "GBFIC2KC2DME4OIZYKO7EYB4PGZNJU5VG4S7TJ4R6LAUFUE64WXVLRPZ";

describe("XLMCheckoutModal - Freighter Rejection and Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Horizon.Server.prototype, "loadAccount").mockResolvedValue(
      new Account(VALID_ACCOUNT, "100") as unknown as Awaited<
        ReturnType<typeof Horizon.Server.prototype.loadAccount>
      >
    );
  });

  it("handles wallet access denial gracefully and displays error toast and message", async () => {
    (freighter.requestAccess as jest.Mock).mockResolvedValueOnce({
      error: { message: "User declined access" },
      address: null,
    });

    const onError = jest.fn();

    render(
      <XLMCheckoutModal
        isOpen={true}
        onClose={jest.fn()}
        amountXLM="10"
        merchantAddress={VALID_ACCOUNT}
        onError={onError}
      />
    );

    const payButton = screen.getByRole("button", { name: /sign and pay with xlm/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(
        screen.getByText("Transaction was rejected in Freighter. Please try again when ready.")
      ).toBeInTheDocument();
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      message: "Transaction was rejected in Freighter. Please try again when ready.",
    });

    expect(onError).toHaveBeenCalledWith(
      "Transaction was rejected in Freighter. Please try again when ready."
    );

    // The modal UI must not freeze: pay button should be re-enabled
    expect(screen.getByRole("button", { name: /sign and pay with xlm/i })).not.toBeDisabled();
  });

  it("handles signTransaction rejection gracefully", async () => {
    (freighter.requestAccess as jest.Mock).mockResolvedValueOnce({
      address: VALID_ACCOUNT,
    });
    (freighter.signTransaction as jest.Mock).mockResolvedValueOnce({
      error: "User rejected transaction signing",
    });

    const onError = jest.fn();

    render(
      <XLMCheckoutModal
        isOpen={true}
        onClose={jest.fn()}
        amountXLM="10"
        merchantAddress={VALID_ACCOUNT}
        onError={onError}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sign and pay with xlm/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Transaction was rejected in Freighter. Please try again when ready.")
      ).toBeInTheDocument();
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      message: "Transaction was rejected in Freighter. Please try again when ready.",
    });

    // Pay button remains interactive, avoiding UI freeze
    expect(screen.getByRole("button", { name: /sign and pay with xlm/i })).not.toBeDisabled();
  });

  it("handles Freighter timeout errors gracefully", async () => {
    (freighter.requestAccess as jest.Mock).mockRejectedValueOnce(
      new Error("Request timed out waiting for Freighter response")
    );

    render(
      <XLMCheckoutModal
        isOpen={true}
        onClose={jest.fn()}
        amountXLM="10"
        merchantAddress="GBEXAMPLE"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /sign and pay with xlm/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Freighter request timed out. Please check your extension and try again.")
      ).toBeInTheDocument();
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      message: "Freighter request timed out. Please check your extension and try again.",
    });

    expect(screen.getByRole("button", { name: /sign and pay with xlm/i })).not.toBeDisabled();
  });
});
