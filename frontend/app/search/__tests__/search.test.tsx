import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchPage from "../page";
import { searchCertificates } from "@/services/certificate";
import type { ProvenanceCertificate } from "@/services/certificate";

jest.mock("@/services/certificate", () => ({
  searchCertificates: jest.fn(),
}));

const mockedSearchCertificates = searchCertificates as jest.MockedFunction<
  typeof searchCertificates
>;

const mockCertificate: ProvenanceCertificate = {
  id: "cert-demo-001",
  ownerAddress: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
  mintedAt: "2024-11-15T10:30:00Z",
  manifestHash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  contentHash: "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  attestationHash: "0xc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
};

describe("SearchPage", () => {
  beforeEach(() => {
    mockedSearchCertificates.mockReset();
  });

  it("renders the search form", () => {
    render(<SearchPage />);
    expect(
      screen.getByRole("heading", { name: /global certificate search/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^search$/i })
    ).toBeDisabled();
  });

  it("shows a loading state while the search is in flight", async () => {
    const user = userEvent.setup();
    let resolveSearch: (value: { results: ProvenanceCertificate[] }) => void = () => {};
    mockedSearchCertificates.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      })
    );

    render(<SearchPage />);
    await user.type(screen.getByRole("searchbox"), "cert-demo-001");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();

    resolveSearch({ results: [mockCertificate] });
    await waitFor(() =>
      expect(document.querySelector(".animate-pulse")).not.toBeInTheDocument()
    );
  });

  it("renders results on a successful search", async () => {
    const user = userEvent.setup();
    mockedSearchCertificates.mockResolvedValue({ results: [mockCertificate] });

    render(<SearchPage />);
    await user.type(screen.getByRole("searchbox"), "cert-demo-001");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(await screen.findByText("cert-demo-001")).toBeInTheDocument();
    expect(mockedSearchCertificates).toHaveBeenCalledWith(
      "cert-demo-001",
      "id"
    );
  });

  it("renders an error message when no certificates are found", async () => {
    const user = userEvent.setup();
    mockedSearchCertificates.mockResolvedValue({
      results: [],
      error: "No certificates found. Check the value and try again.",
    });

    render(<SearchPage />);
    await user.type(screen.getByRole("searchbox"), "unknown-cert");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no certificates found/i
    );
  });

  it("renders an error message when the search rejects", async () => {
    const user = userEvent.setup();
    mockedSearchCertificates.mockRejectedValue(new Error("network down"));

    render(<SearchPage />);
    await user.type(screen.getByRole("searchbox"), "cert-demo-001");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i
    );
  });

  it("toggles the search field between certificate ID and content hash", async () => {
    const user = userEvent.setup();
    mockedSearchCertificates.mockResolvedValue({ results: [mockCertificate] });

    render(<SearchPage />);

    const idButton = screen.getByRole("button", { name: /certificate id/i });
    const hashButton = screen.getByRole("button", { name: /content hash/i });

    expect(idButton).toHaveAttribute("aria-pressed", "true");
    expect(hashButton).toHaveAttribute("aria-pressed", "false");

    await user.click(hashButton);

    expect(idButton).toHaveAttribute("aria-pressed", "false");
    expect(hashButton).toHaveAttribute("aria-pressed", "true");

    await user.type(screen.getByRole("searchbox"), "0xb2c3");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    expect(mockedSearchCertificates).toHaveBeenCalledWith("0xb2c3", "contentHash");
  });

  it("clears the query and results when the clear button is pressed", async () => {
    const user = userEvent.setup();
    mockedSearchCertificates.mockResolvedValue({ results: [mockCertificate] });

    render(<SearchPage />);
    const input = screen.getByRole("searchbox");
    await user.type(input, "cert-demo-001");
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(await screen.findByText("cert-demo-001")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear search/i }));

    expect(input).toHaveValue("");
    expect(screen.queryByText("cert-demo-001")).not.toBeInTheDocument();
  });
});
