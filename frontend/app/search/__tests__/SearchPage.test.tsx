/**
 * Integration tests for the Global Certificate Search page.
 *
 * Directly exercises the two acceptance criteria of Issue #377:
 *   1. "Search queries return correct data from the API."
 *   2. "Loading spinners show during fetch."
 * ...plus the third requirement: "Pass data to List/Grid views."
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchPage from "../page";
import { searchCertificates } from "../../../services/searchService";
import type {
  CertificateSearchResult,
  SearchCertificate,
} from "../../../services/searchService";

/* ------------------------------------------------------------------ */
/*                              Mocks                                  */
/* ------------------------------------------------------------------ */

jest.mock("../../../services/searchService", () => {
  const actual = jest.requireActual("../../../services/searchService");
  return { ...actual, searchCertificates: jest.fn() };
});

// The global Header pulls in Freighter/wallet APIs that are irrelevant here.
jest.mock("../../../components/Header", () => ({
  __esModule: true,
  default: () => <header data-testid="site-header" />,
}));

const replaceMock = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  usePathname: () => "/search",
  useSearchParams: () => currentParams,
}));

const mockedSearch = searchCertificates as jest.MockedFunction<typeof searchCertificates>;

/* ------------------------------------------------------------------ */
/*                             Fixtures                                */
/* ------------------------------------------------------------------ */

const CERT_A: SearchCertificate = {
  id: "SP-CERT-000148",
  certificateId: "SP-CERT-000148",
  title: "Aurora Over Reykjavik",
  creator: "GBVBK2TX7QHEQNIMUPBVPZ7EONL52TWKQ7OXFDJPAJPYGNZFACUQBXP",
  contentHash: "sha256:9f2c4a7b1e8d05f36a4c9b2e7d1f08a35c6b9e4d2f7a1c8b05e3d6f9a2c4b7e1",
  manifestHash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  network: "mainnet",
  status: "verified",
  mintedAt: "2026-07-01T10:00:00.000Z",
  sizeBytes: 1024,
  tags: ["photography"],
};

const CERT_B: SearchCertificate = {
  ...CERT_A,
  id: "SP-CERT-000147",
  certificateId: "SP-CERT-000147",
  title: "Quarterly Investor Report",
  status: "pending",
  network: "testnet",
  tags: ["document"],
};

function ok(
  results: SearchCertificate[],
  overrides: Partial<CertificateSearchResult> = {}
): CertificateSearchResult {
  return {
    results,
    total: results.length,
    page: 1,
    limit: 12,
    totalPages: 1,
    source: "api",
    ...overrides,
  };
}

/** A promise the test controls, so we can assert on the in-flight UI. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  currentParams = new URLSearchParams();
  // jsdom does not implement smooth scrolling; stub it to keep output clean.
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo;
});

/* ------------------------------------------------------------------ */
/*                               Tests                                 */
/* ------------------------------------------------------------------ */

describe("SearchPage — Global Certificate Search", () => {
  it("renders the idle prompt before any search has run", async () => {
    mockedSearch.mockResolvedValue(ok([]));
    render(<SearchPage />);

    expect(await screen.findByTestId("search-idle")).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: /search certificates/i })
    ).toBeInTheDocument();
  });

  it("AC2: shows a loading spinner while the fetch is in flight", async () => {
    const d = deferred<CertificateSearchResult>();
    mockedSearch.mockReturnValue(d.promise);

    currentParams = new URLSearchParams("q=aurora");
    render(<SearchPage />);

    // Spinners (search bar + results meta bar) and the skeleton are visible
    // while the request is pending.
    const spinners = await screen.findAllByTestId("search-spinner");
    expect(spinners.length).toBeGreaterThan(0);
    expect(screen.getByTestId("list-view-skeleton")).toBeInTheDocument();
    // Progress is announced to assistive tech and the region is marked busy.
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    expect(screen.getByText(/searching…/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/search results/i)).toHaveAttribute(
      "aria-busy",
      "true"
    );

    d.resolve(ok([CERT_A]));

    // Spinners and skeleton disappear once the data lands.
    await waitFor(() =>
      expect(screen.queryByTestId("list-view-skeleton")).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.queryAllByTestId("search-spinner")).toHaveLength(0)
    );
  });

  it("AC1: renders the certificates returned by the API", async () => {
    mockedSearch.mockResolvedValue(ok([CERT_A, CERT_B], { total: 2 }));
    currentParams = new URLSearchParams("q=cert");

    render(<SearchPage />);

    const list = await screen.findByTestId("search-list-view");
    expect(within(list).getByText("Aurora Over Reykjavik")).toBeInTheDocument();
    expect(within(list).getByText("Quarterly Investor Report")).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);

    // Result count is reported to the user.
    expect(await screen.findByText(/2 certificates/i)).toBeInTheDocument();

    // Each row deep-links to the certificate detail page.
    expect(within(list).getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/certificate/SP-CERT-000148"
    );
  });

  it("sends the typed query to the API", async () => {
    const user = userEvent.setup();
    mockedSearch.mockResolvedValue(ok([CERT_A]));

    render(<SearchPage />);
    await user.type(
      screen.getByRole("searchbox", { name: /search certificates/i }),
      "aurora"
    );

    await waitFor(() =>
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: "aurora" })
      )
    );
  });

  it("passes data to the Grid view when ?view=grid", async () => {
    mockedSearch.mockResolvedValue(ok([CERT_A, CERT_B], { total: 2 }));
    currentParams = new URLSearchParams("q=cert&view=grid");

    render(<SearchPage />);

    const grid = await screen.findByTestId("search-grid-view");
    expect(within(grid).getByText("Aurora Over Reykjavik")).toBeInTheDocument();
    expect(within(grid).getByText("Quarterly Investor Report")).toBeInTheDocument();
    expect(screen.queryByTestId("search-list-view")).not.toBeInTheDocument();
  });

  it("forwards status / network / sort filters from the URL to the API", async () => {
    mockedSearch.mockResolvedValue(ok([CERT_A]));
    currentParams = new URLSearchParams(
      "q=cert&status=verified&network=mainnet&sort=oldest&page=2"
    );

    render(<SearchPage />);

    await waitFor(() =>
      expect(mockedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "cert",
          status: "verified",
          network: "mainnet",
          sort: "oldest",
          page: 2,
        })
      )
    );
  });

  it("shows an error state with a working retry button when the API fails", async () => {
    const user = userEvent.setup();
    mockedSearch.mockRejectedValueOnce(new Error("The API is temporarily unavailable."));
    currentParams = new URLSearchParams("q=broken");

    render(<SearchPage />);

    const alert = await screen.findByTestId("search-error");
    expect(within(alert).getByText(/temporarily unavailable/i)).toBeInTheDocument();

    mockedSearch.mockResolvedValueOnce(ok([CERT_A]));
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByTestId("search-list-view")).toBeInTheDocument();
    expect(screen.queryByTestId("search-error")).not.toBeInTheDocument();
  });

  it("shows the no-results state when the API returns an empty set", async () => {
    mockedSearch.mockResolvedValue(ok([], { total: 0 }));
    currentParams = new URLSearchParams("q=zzz-nothing");

    render(<SearchPage />);

    const empty = await screen.findByTestId("search-empty");
    expect(within(empty).getByText(/no certificates found/i)).toBeInTheDocument();
    expect(within(empty).getByText(/zzz-nothing/)).toBeInTheDocument();
  });

  it("renders pagination and requests the next page via the URL", async () => {
    const user = userEvent.setup();
    mockedSearch.mockResolvedValue(
      ok([CERT_A], { total: 36, totalPages: 3, page: 1 })
    );
    currentParams = new URLSearchParams("q=cert");

    render(<SearchPage />);
    await screen.findByTestId("search-list-view");

    const pagination = await screen.findByRole("navigation", {
      name: /search results pagination/i,
    });
    await user.click(within(pagination).getByRole("button", { name: /go to page 2/i }));

    expect(replaceMock).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      expect.anything()
    );
  });

  it("flags sample data when the service falls back to mocks", async () => {
    mockedSearch.mockResolvedValue(ok([CERT_A], { source: "mock" }));
    currentParams = new URLSearchParams("q=cert");

    render(<SearchPage />);

    expect(await screen.findByText(/sample data/i)).toBeInTheDocument();
  });
});
