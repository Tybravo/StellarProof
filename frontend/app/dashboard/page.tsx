"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Package, ShieldCheck, ListFilter, User, LogIn } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/app/context/AuthContext";
import {
  verificationService,
  type VerificationRequest,
  type VerificationStatus,
} from "@/services/verificationService";
import { fetchDigitalProducts, type DigitalProduct } from "@/services/productMock";
import UserProductsView from "@/components/dashboard/UserProductsView";
import Header from "@/components/Header";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function truncateHash(hash: string): string {
  if (!hash) return "-";
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

function AuthPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <User className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
        Access Your StellarProof Dashboard
      </h3>
      <p className="mb-8 max-w-md text-sm text-gray-500 dark:text-gray-400">
        Sign in with your email account or connect your Freighter wallet to view your verified products, manifests, attestations, and content provenance certificates.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-primary-dark transition-all duration-200"
        >
          <LogIn className="w-4 h-4" />
          Sign In with Email
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 dark:border-white/10 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200"
        >
          Create New Account
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected, publicKey } = useWallet();
  const { isAuthenticated, user } = useAuth();

  const isUserAuthenticated = isAuthenticated || isConnected;

  const [activeTab, setActiveTab] = useState<"products" | "requests">("products");
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load products (default view)
  useEffect(() => {
    if (!isUserAuthenticated) return;
    let cancelled = false;

    const loadProductsData = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await fetchDigitalProducts();
        if (!cancelled) setProducts(res);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    };

    loadProductsData();

    return () => {
      cancelled = true;
    };
  }, [isUserAuthenticated]);

  // Load verification requests
  useEffect(() => {
    if (!isUserAuthenticated) return;
    let cancelled = false;

    const loadRequestsData = async () => {
      setIsLoadingRequests(true);
      try {
        const key = publicKey || "user-web2-session";
        const next = await verificationService.getRequests(key);
        if (!cancelled) setRequests(next);
      } catch (err) {
        console.error("Failed to load verification requests:", err);
      } finally {
        if (!cancelled) setIsLoadingRequests(false);
      }
    };

    loadRequestsData();

    return () => {
      cancelled = true;
    };
  }, [isUserAuthenticated, publicKey]);

  const totalPages = useMemo(
    () => Math.ceil(requests.length / pageSize),
    [requests.length, pageSize]
  );

  const paginatedRequests = useMemo(
    () => requests.slice((page - 1) * pageSize, page * pageSize),
    [requests, page, pageSize]
  );

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const displayName = user?.name || user?.email || (publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : "Creator");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Dashboard Welcome Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              User Verification Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Welcome back, <span className="font-semibold text-primary">{displayName}</span>! Access and verify your digital media provenance.
            </p>
          </div>

          {/* Quick Actions Bar */}
          {isUserAuthenticated && (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/verify"
                aria-label="Quick Action: Verify Authenticity"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-dark transition-all duration-200"
              >
                <ShieldCheck className="w-4 h-4" />
                Verify Authenticity
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                aria-label="Quick Action: My Products"
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === "products"
                    ? "bg-darkblue dark:bg-white text-white dark:text-gray-900 shadow-sm"
                    : "border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
                }`}
              >
                <Package className="w-4 h-4" />
                My Products
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        {!isUserAuthenticated ? (
          <AuthPrompt />
        ) : (
          <div className="space-y-6">
            {/* View Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("products")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "products"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <Package className="w-4 h-4" />
                My Products (Default)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === "requests"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                <ListFilter className="w-4 h-4" />
                Verification Requests ({requests.length})
              </button>
            </div>

            {/* TAB 1: MY PRODUCTS (DEFAULT VIEW) */}
            {activeTab === "products" && (
              <UserProductsView products={products} isLoading={isLoadingProducts} />
            )}

            {/* TAB 2: VERIFICATION REQUESTS */}
            {activeTab === "requests" && (
              <div className="space-y-4">
                {isLoadingRequests ? (
                  <div className="flex items-center justify-center py-20 text-primary font-medium">
                    Loading requests...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                    No verification requests submitted yet.
                  </div>
                ) : (
                  <>
                    {/* Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-darkblue p-4 rounded-xl border border-gray-200 dark:border-white/10">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {requests.length} verification request{requests.length !== 1 ? "s" : ""}
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
                    <div className="hidden overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 sm:block bg-white dark:bg-darkblue shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <tr>
                            {["Date", "Request ID", "Content Hash", "Status", "Actions"].map((h) => (
                              <th key={h} className="px-6 py-3.5">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/10 text-sm">
                          {paginatedRequests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <td className="whitespace-nowrap px-6 py-4 text-gray-700 dark:text-gray-300">
                                {req.date}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                                {req.id}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                                {truncateHash(req.contentHash)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <StatusBadge status={req.status} />
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <Link
                                  href={`/verify?id=${req.id}`}
                                  className="font-semibold text-primary hover:underline"
                                >
                                  View Request
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="flex flex-col gap-3 sm:hidden">
                      {paginatedRequests.map((req) => (
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}
