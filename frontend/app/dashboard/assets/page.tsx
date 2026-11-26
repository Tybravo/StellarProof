"use client";

import React, { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import Header from "@/components/Header";
import { useWallet } from "@/context/WalletContext";
import { fetchAssets, type DigitalAsset } from "@/services/assetsMock";
import AssetTable from "./components/AssetTable";
import AssetGrid from "./components/AssetGrid";

type ViewMode = "table" | "grid";

export default function AssetsPage() {
  const { publicKey } = useWallet();
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const data = await fetchAssets(publicKey ?? undefined);
      if (!cancelled) {
        setAssets(data);
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-white dark:bg-darkblue">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Digital Assets
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A dense overview of every asset in your vault, including encryption
              and verification status.
            </p>
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1"
            role="group"
            aria-label="Asset view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              aria-label="Table view"
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Grid view"
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>
        </div>

        {viewMode === "table" ? (
          <AssetTable assets={assets} isLoading={isLoading} />
        ) : (
          <AssetGrid />
        )}
      </main>
    </div>
  );
}
