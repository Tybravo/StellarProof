import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlobalSearchBar } from "../GlobalSearchBar";
import { searchCertificates } from "@/app/search/services/searchService";
import type { SearchResult } from "@/app/search/types";

jest.mock("@/app/search/services/searchService", () => ({
  searchCertificates: jest.fn(),
}));

const mockedSearch = searchCertificates as jest.MockedFunction<
  typeof searchCertificates
>;

const SAMPLE_CERT: SearchResult = {
  id: "cert-demo-001",
  name: "Genesis Asset Certificate",
  hash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
  mintedAt: "2026-01-12T10:42:00Z",
  status: "verified",
  network: "Stellar",
};

describe("GlobalSearchBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSearch.mockResolvedValue([SAMPLE_CERT]);
  });

  it("renders a globally accessible search input and accepts user input", async () => {
    const user = userEvent.setup();
    render(<GlobalSearchBar debounceMs={10} />);

    const input = screen.getByRole("searchbox", {
      name: /search certificate hashes/i,
    });
    expect(input).toBeInTheDocument();

    await user.type(input, "0xa1b2c3");
    expect(input).toHaveValue("0xa1b2c3");
  });

  it("shows loading state and renders matching certificate results after debounce", async () => {
    let resolveSearch!: (data: SearchResult[]) => void;
    mockedSearch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<GlobalSearchBar debounceMs={10} />);

    const input = screen.getByRole("searchbox", {
      name: /search certificate hashes/i,
    });
    await user.type(input, "0xa1b2c3");

    expect(
      screen.getByText(/searching certificate index/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledWith(
        "0xa1b2c3",
        expect.objectContaining({ signal: expect.any(AbortSignal), limit: 6 }),
      );
    });

    await act(async () => {
      resolveSearch([SAMPLE_CERT]);
    });

    const link = await screen.findByRole("link", {
      name: /genesis asset certificate/i,
    });
    expect(link).toHaveAttribute("href", "/certificate/cert-demo-001");
  });

  it("displays an error state and retries when lookup fails", async () => {
    mockedSearch
      .mockRejectedValueOnce(new Error("API unreachable"))
      .mockResolvedValueOnce([SAMPLE_CERT]);

    const user = userEvent.setup();
    render(<GlobalSearchBar debounceMs={10} />);

    await user.type(
      screen.getByRole("searchbox", { name: /search certificate hashes/i }),
      "0xdeadbeef",
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("API unreachable");

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(
      await screen.findByRole("link", { name: /genesis asset certificate/i }),
    ).toBeInTheDocument();
  });

  it("clears query and closes dropdown when clear button or Escape is triggered", async () => {
    const user = userEvent.setup();
    render(<GlobalSearchBar debounceMs={10} />);

    const input = screen.getByRole("searchbox", {
      name: /search certificate hashes/i,
    });
    await user.type(input, "0xa1b2");

    await screen.findByRole("listbox", {
      name: /certificate search results/i,
    });

    fireEvent.keyDown(input, { key: "Escape" });
    expect(
      screen.queryByRole("listbox", { name: /certificate search results/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /clear search/i }));
    expect(input).toHaveValue("");
    expect(mockedSearch).toHaveBeenCalledTimes(1);
  });

  it("navigates to matching certificate on form submit", async () => {
    const onNavigate = jest.fn();
    const user = userEvent.setup();
    render(<GlobalSearchBar debounceMs={10} onNavigate={onNavigate} />);

    const input = screen.getByRole("searchbox", {
      name: /search certificate hashes/i,
    });
    await user.type(input, SAMPLE_CERT.hash);
    await screen.findByRole("link", { name: /genesis asset certificate/i });

    await user.keyboard("{Enter}");
    expect(onNavigate).toHaveBeenCalledWith("/certificate/cert-demo-001");
  });
});
