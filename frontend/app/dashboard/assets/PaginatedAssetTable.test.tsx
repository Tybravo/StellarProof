import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "@/components/ui/Pagination";
import { useAssetPagination, type PaginationRequest, type PaginatedResult } from "@/hooks/useAssetPagination";
import { MOCK_ASSETS, type DigitalAsset } from "@/services/assetsMock";
import AssetTable from "./components/AssetTable";

const assets = Array.from({ length: 12 }, (_, index) => ({
  ...MOCK_ASSETS[index % MOCK_ASSETS.length],
  id: String(index + 1),
  name: `Asset ${index + 1}`,
}));

function DashboardTableHarness({ fetchPage }: {
  fetchPage: (request: PaginationRequest) => Promise<PaginatedResult<DigitalAsset>>;
}) {
  const { page, totalPages, hasNext, state, onPage, retry } = useAssetPagination(fetchPage, 10);
  return (
    <section aria-label="Asset results" aria-busy={state.status === "loading"}>
      {state.status === "error" ? (
        <div role="alert">
          Unable to load assets. <button onClick={retry}>Retry</button>
        </div>
      ) : (
        <AssetTable assets={state.status === "success" ? state.data.items : []}
          isLoading={state.status === "loading"} />
      )}
      <Pagination page={page} totalPages={totalPages} hasNext={hasNext}
        isLoading={state.status === "loading"} onPage={onPage} />
    </section>
  );
}

const next = () => screen.getByRole("button", { name: "Next page" });
const previous = () => screen.getByRole("button", { name: "Previous page" });

test("Next and Previous fetch and render different pages of dashboard rows", async () => {
  const fetchPage = jest.fn(async ({ skip, limit }: PaginationRequest) => ({
    items: assets.slice(skip, skip + limit),
    total: assets.length,
  }));
  render(<DashboardTableHarness fetchPage={fetchPage} />);
  expect(screen.getByRole("region", { name: "Asset results" })).toHaveAttribute("aria-busy", "true");
  expect(previous()).toBeDisabled();
  expect(next()).toBeDisabled();
  await screen.findByText("Asset 1");
  fireEvent.click(next());
  await screen.findByText("Asset 11");
  expect(screen.queryByText("Asset 1")).toBeNull();
  expect(next()).toBeDisabled();
  fireEvent.click(previous());
  await screen.findByText("Asset 1");
  expect(screen.queryByText("Asset 11")).toBeNull();
  expect(fetchPage.mock.calls.map(([{ skip, limit }]) => ({ skip, limit }))).toEqual([
    { skip: 0, limit: 10 },
    { skip: 10, limit: 10 },
    { skip: 0, limit: 10 },
  ]);
});

test("a failed page hides previous rows and retries the same offset", async () => {
  const fetchPage = jest.fn(async ({ skip, limit }: PaginationRequest) => ({
    items: assets.slice(skip, skip + limit),
    total: assets.length,
  }));
  render(<DashboardTableHarness fetchPage={fetchPage} />);
  await screen.findByText("Asset 1");
  fetchPage.mockRejectedValueOnce(new Error("temporarily unavailable"));
  fireEvent.click(next());
  await screen.findByRole("alert");
  expect(screen.queryByRole("table")).toBeNull();
  expect(next()).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Asset 11");
  expect(fetchPage.mock.calls.map(([request]) => request.skip)).toEqual([0, 10, 10]);
});

test("renders the dashboard empty state with no navigation", async () => {
  const fetchPage = jest.fn(async () => ({ items: [], total: 0 }));
  render(<DashboardTableHarness fetchPage={fetchPage} />);
  await screen.findByText("No assets found.");
  expect(screen.getByText("No pages")).toBeInTheDocument();
  expect(previous()).toBeDisabled();
  expect(next()).toBeDisabled();
});

test("handles malformed pagination metadata as a request error", async () => {
  render(<DashboardTableHarness fetchPage={async () => ({ items: assets, total: NaN })} />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  expect(previous()).toBeDisabled();
  expect(next()).toBeDisabled();
});
