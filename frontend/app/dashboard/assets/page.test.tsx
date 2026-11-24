import { fireEvent, render, screen } from "@testing-library/react";
import AssetsPage from "./page";
import { fetchMockAssetPage } from "@/services/assetsMock";

jest.mock("@/components/Header", () => ({
  __esModule: true,
  default: function MockHeader() {
    return <div>Header</div>;
  },
}));
jest.mock("@/context/WalletContext", () => ({ useWallet: () => ({ publicKey: "GTEST" }) }));
jest.mock("@/services/assetsMock", () => {
  const actual = jest.requireActual("@/services/assetsMock");
  return { ...actual, fetchMockAssetPage: jest.fn(actual.fetchMockAssetPage) };
});

const pageRequests = fetchMockAssetPage as jest.MockedFunction<typeof fetchMockAssetPage>;

test("pages the actual dashboard route through the temporary asset adapter", async () => {
  render(<AssetsPage />);
  await screen.findByText("Limited Edition Digital Artwork");

  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await screen.findByText(/ 11$/);
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await screen.findByText(/ 21$/);
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  await screen.findByText(/ 11$/);
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  await screen.findByText("Limited Edition Digital Artwork");

  expect(pageRequests.mock.calls.map(([{ skip, limit }]) => ({ skip, limit }))).toEqual([
    { skip: 0, limit: 10 },
    { skip: 10, limit: 10 },
    { skip: 20, limit: 10 },
    { skip: 10, limit: 10 },
    { skip: 0, limit: 10 },
  ]);
});
