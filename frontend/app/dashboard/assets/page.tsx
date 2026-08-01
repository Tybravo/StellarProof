"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useWallet } from "@/context/WalletContext";
import { fetchAssets, type DigitalAsset } from "@/services/assetsMock";
import AssetTable from "./components/AssetTable";

export default function AssetsPage() {
  const { publicKey } = useWallet();
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Digital Assets
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          A dense overview of every asset in your vault, including encryption
          and verification status.
        </p>

        <AssetTable assets={assets} isLoading={isLoading} />
      </main>
    </div>
  );
}
