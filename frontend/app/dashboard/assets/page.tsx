"use client";

import React, { useCallback } from "react";
import Header from "@/components/Header";
import Pagination from "@/components/ui/Pagination";
import { useWallet } from "@/context/WalletContext";
import { useAssetPagination } from "@/hooks/useAssetPagination";
import { fetchMockAssetPage } from "@/services/assetsMock";
import AssetTable from "./components/AssetTable";
import AssetGrid from "./components/AssetGrid";

type ViewMode = "table" | "grid";

export default function AssetsPage() {
  const { publicKey } = useWallet();
  const fetchPage = useCallback(
    (request: Parameters<typeof fetchMockAssetPage>[0]) =>
      fetchMockAssetPage(request, publicKey ?? undefined),
    [publicKey],
  );
  const { page, totalPages, hasNext, state, onPage, retry } =
    useAssetPagination(fetchPage, 10, publicKey ?? "anonymous");

  return (
    <div className="min-h-screen bg-white dark:bg-darkblue">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Digital Assets
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          A dense overview of every asset in your vault, including encryption
          and verification status.
        </p>

        <section aria-label="Asset results" aria-busy={state.status === "loading"}>
          {state.status === "error" ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              Unable to load assets. <button type="button" className="font-medium underline" onClick={retry}>Retry</button>
            </div>
          ) : (
            <AssetTable
              assets={state.status === "success" ? state.data.items : []}
              isLoading={state.status === "loading"}
            />
          )}
          <div className="mt-4 flex justify-end">
            <Pagination
              page={page}
              totalPages={totalPages}
              hasNext={hasNext}
              isLoading={state.status === "loading"}
              onPage={onPage}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
