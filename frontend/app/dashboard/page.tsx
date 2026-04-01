"use client";

import { useEffect, useState, useMemo } from "react";
import { useWallet } from "@/context/WalletContext";
import {
  verificationService,
  type VerificationRequest,
  type VerificationStatus,
} from "@/services/verificationService";
import Link from "next/link";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function StatusBadge({ status }: { status: VerificationStatus }) {
  const styles: Record<VerificationStatus, string> = {
    verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        No verification requests yet
      </h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        You haven&apos;t submitted any verification requests. Start by verifying your first piece of content.
      </p>
      <Link
        href="/verify"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 transition-colors"
      >
        Start New Verification
      </Link>
    </div>
  );
}

function WalletPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        Connect your wallet
      </h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Connect your Freighter wallet to view your verification requests.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary/90 transition-colors"
      >
        Go to Home to Connect
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected, publicKey } = useWallet();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (!isConnected || !publicKey) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const next = await verificationService.getRequests(publicKey);
        if (!cancelled) {
          setRequests(next);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isConnected, publicKey]);

  const totalPages = useMemo(
    () => Math.ceil(requests.length / pageSize),
    [requests.length, pageSize]
  );

  const paginated = useMemo(
    () => requests.slice((page - 1) * pageSize, page * pageSize),
    [requests, page, pageSize]
  );

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-white dark:bg-darkblue-dark px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Verification Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track all your content verification requests in one place.
          </p>
        </div>

        {/* Content */}
        {!isConnected ? (
          <WalletPrompt />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Controls */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {requests.length} request{requests.length !== 1 ? "s" : ""} found
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Rows per page:</span>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      pageSize === size
                        ? "bg-primary text-white"
                        : "hover:bg-gray-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 sm:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    {["Date", "Request ID", "Content Hash", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-darkblue">
                  {paginated.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {req.date}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">
                        {req.id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                        {truncateHash(req.contentHash)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/verify?id=${req.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {paginated.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {req.id}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{req.date}</p>
                  <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {truncateHash(req.contentHash)}
                  </p>
                  <Link
                    href={`/verify?id=${req.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
