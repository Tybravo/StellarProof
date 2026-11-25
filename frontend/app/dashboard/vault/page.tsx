"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import DecryptionRequestModal from "@/components/vault/DecryptionRequestModal";
import { fetchAssets, type DigitalAsset } from "@/services/assetsMock";
import { useWallet } from "@/context/WalletContext";

export default function SealedProvenanceVaultPage() {
  const { publicKey } = useWallet();
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DigitalAsset | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAssets(publicKey ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setError(null);
        setAssets(data.filter((asset) => asset.kmsEncryptionStatus === "encrypted"));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load sealed assets.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function confirmDecryption() {
    if (!selected) return;
    setRequesting(true);
    setRequestError(null);
    try {
      const response = await fetch("/api/vault/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: selected.id, kmsKeyId: selected.kmsKeyId }),
      });
      if (!response.ok) throw new Error("Decryption request was rejected.");
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Decryption request failed.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-darkblue">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sealed Provenance Vault</h1>
        <p className="mt-1 mb-6 text-sm text-gray-500">Assets encrypted with a KMS key. Unencrypted files stay off this view.</p>
        {isLoading ? <p className="text-sm text-gray-500">Loading sealed assets…</p> : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {!isLoading && !error && assets.length === 0 ? (
          <p className="text-sm text-gray-500">No sealed assets yet.</p>
        ) : null}
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.kmsKeyId}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700"
                onClick={() => {
                  setSelected(asset);
                  setRequestError(null);
                }}
              >
                Request decryption
              </button>
            </li>
          ))}
        </ul>
      </main>
      <DecryptionRequestModal
        open={selected !== null}
        assetName={selected?.name ?? ""}
        loading={requesting}
        error={requestError}
        onClose={() => {
          if (!requesting) setSelected(null);
        }}
        onConfirm={() => void confirmDecryption()}
      />
    </div>
  );
}
