"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Award, Wallet } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import {
  fetchMintedCertificates,
  type MintedCertificateRecord,
} from "@/services/attestationsClient";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shortHash(hash: string): string {
  return hash.length > 18 ? `${hash.slice(0, 10)}...${hash.slice(-6)}` : hash;
}

function CertificateCard({ cert }: { cert: MintedCertificateRecord }) {
  return (
    <li>
      <Link
        href={`/certificate/${cert.certificateId}`}
        className="block h-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-5 transition hover:border-blue-400 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Award className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
              {cert.certificateId}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Minted {formatDate(cert.attestedAt)}
            </p>
          </div>
        </div>
        <dl className="space-y-1 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Content hash</dt>
            <dd className="font-mono text-gray-800 dark:text-gray-200" title={cert.contentHash}>
              {shortHash(cert.contentHash)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Attestation</dt>
            <dd className="font-mono text-gray-800 dark:text-gray-200" title={cert.attestationHash}>
              {shortHash(cert.attestationHash)}
            </dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

function SkeletonGrid() {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading certificates"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          data-testid="certificate-skeleton"
          className="h-36 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10"
        />
      ))}
    </ul>
  );
}

export default function CertificatesPage() {
  const { publicKey, isConnected, isConnecting, connect } = useWallet();
  const [reloadToken, setReloadToken] = useState(0);
  // Outcome of the most recent request, tagged with the request it belongs to
  // so loading can be derived instead of set synchronously inside the effect.
  const [outcome, setOutcome] = useState<{
    key: string;
    data: MintedCertificateRecord[];
    error: string | null;
  } | null>(null);

  const requestKey = publicKey ? `${publicKey}:${reloadToken}` : null;

  useEffect(() => {
    if (!publicKey || !requestKey) return;

    const controller = new AbortController();

    fetchMintedCertificates(publicKey, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOutcome({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setOutcome({
          key: requestKey,
          data: [],
          error: err instanceof Error ? err.message : "Unable to load your certificates.",
        });
      });

    return () => controller.abort();
  }, [publicKey, requestKey]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  const isLoading = outcome?.key !== requestKey;
  const certificates = outcome?.data ?? [];
  const error = outcome?.error ?? null;

  let body: React.ReactNode;
  if (!isConnected || !publicKey) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-white/20 p-10 text-center">
        <Wallet className="h-8 w-8 text-gray-400" aria-hidden="true" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Connect your wallet to see the certificates you have minted.
        </p>
        <button
          type="button"
          onClick={() => void connect()}
          disabled={isConnecting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isConnecting ? "Connecting..." : "Connect wallet"}
        </button>
      </div>
    );
  } else if (isLoading) {
    body = <SkeletonGrid />;
  } else if (error) {
    body = (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </span>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  } else if (certificates.length === 0) {
    body = (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/20 p-10 text-center text-sm text-gray-600 dark:text-gray-300">
        You have not minted any certificates yet.{" "}
        <Link href="/verify" className="text-blue-600 underline dark:text-blue-400">
          Start a verification
        </Link>
        .
      </div>
    );
  } else {
    body = (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {certificates.map((cert) => (
          <CertificateCard key={cert.id} cert={cert} />
        ))}
      </ul>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Certificates
      </h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Every Provenance Certificate you have minted.
      </p>
      {body}
    </div>
  );
}
