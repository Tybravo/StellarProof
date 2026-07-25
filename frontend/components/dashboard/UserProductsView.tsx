"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Package,
  Search,
  Check,
  Copy,
  ExternalLink,
  FileCode,
  Cpu,
  Award,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  PlusCircle,
  Filter,
} from "lucide-react";
import { type DigitalProduct } from "@/services/productMock";

interface UserProductsViewProps {
  products: DigitalProduct[];
  isLoading: boolean;
  onRefresh?: () => void;
}

function truncate(str: string, lead = 8, tail = 6): string {
  if (!str) return "-";
  if (str.length <= lead + tail) return str;
  return `${str.slice(0, lead)}...${str.slice(-tail)}`;
}

function StatusBadge({ status }: { status: DigitalProduct["status"] }) {
  const styles: Record<DigitalProduct["status"], string> = {
    verified: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    revoked: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    failed: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${styles[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "verified"
            ? "bg-green-500"
            : status === "pending"
            ? "bg-amber-500 animate-pulse"
            : "bg-red-500"
        }`}
      />
      {status}
    </span>
  );
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label || value}`}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary transition-colors"
    >
      {copied ? (
        <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-400 font-medium">
          <Check className="w-3.5 h-3.5" />
          Copied
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5">
          <Copy className="w-3.5 h-3.5" />
          Copy
        </span>
      )}
    </button>
  );
}

export default function UserProductsView({ products, isLoading }: UserProductsViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: "manifest" | "attestation";
    product: DigitalProduct;
  } | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.creator.toLowerCase().includes(search.toLowerCase()) ||
        p.requestId.toLowerCase().includes(search.toLowerCase()) ||
        p.verificationHash.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 dark:from-primary/20 dark:via-primary/10 dark:to-transparent">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            My Verified Products & Provenance
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
            Manage your digital media authenticity proofs, manifests, TEE attestations, and on-chain Stellar certificates.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark shadow-md shadow-primary/20 hover:shadow-lg transition-all duration-200"
            aria-label="Verify Authenticity action button"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify Authenticity
          </Link>
        </div>
      </div>

      {/* Filters and View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-darkblue p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, IDs, hashes, creators..."
            aria-label="Search my products"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-darkblue-dark text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-darkblue-dark text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Grid / Table Toggle */}
          <div className="flex items-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-darkblue-dark p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Switch to Table view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-primary text-primary dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Switch to Grid view"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-white dark:bg-primary text-primary dark:text-white shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="inline-flex items-center gap-2 text-primary font-medium">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading your verified products...
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 text-center rounded-2xl bg-white dark:bg-darkblue border border-gray-200 dark:border-white/10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            No product verification records found
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-6">
            {search || statusFilter !== "all"
              ? "No products match your search or filter criteria. Try resetting filters."
              : "You haven't registered or verified any digital media assets yet. Click below to get started."}
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Verify New Content
          </Link>
        </div>
      ) : viewMode === "table" ? (
        /* Responsive Row & Column Table View */
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-6 py-4">Product / Media</th>
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Verification Hash</th>
                  <th className="px-6 py-4">Proof & Provenance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                {filteredProducts.map((product) => {
                  const isExpanded = expandedId === product.id;
                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-gray-50/60 dark:hover:bg-white/5 transition-colors">
                        {/* Product Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-11 h-11 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                by {product.creator}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Request ID */}
                        <td className="px-6 py-4 font-mono text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                          {product.requestId}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={product.status} />
                        </td>

                        {/* Verification Hash */}
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <span>{truncate(product.verificationHash, 8, 6)}</span>
                            <CopyBtn value={product.verificationHash} label="Content Hash" />
                          </div>
                        </td>

                        {/* Proof & Provenance Buttons */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveModal({ type: "manifest", product })}
                              aria-label={`View Manifest for ${product.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-medium transition"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                              Manifest
                            </button>

                            <button
                              type="button"
                              onClick={() => setActiveModal({ type: "attestation", product })}
                              aria-label={`View TEE Attestation for ${product.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs font-medium transition"
                            >
                              <Cpu className="w-3.5 h-3.5" />
                              TEE Proof
                            </button>

                            {product.certificate && (
                              <Link
                                href={product.certificate.certificateUrl}
                                aria-label={`View Certificate for ${product.name}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-medium transition"
                              >
                                <Award className="w-3.5 h-3.5" />
                                Certificate
                              </Link>
                            )}
                          </div>
                        </td>

                        {/* Expand / Details Action */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleExpand(product.id)}
                            aria-label={`Toggle details for ${product.name}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                          >
                            <span>{isExpanded ? "Hide Details" : "Inspect"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Accordion Expanded Detail Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/90 dark:bg-darkblue-dark/80">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Product & Manifest Info */}
                              <div className="p-3.5 rounded-xl bg-white dark:bg-darkblue border border-gray-200 dark:border-white/10 space-y-2">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                  <FileCode className="w-4 h-4 text-blue-500" />
                                  Manifest Metadata
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  <span className="font-medium text-gray-500">Title:</span>{" "}
                                  {product.manifest.title}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  <span className="font-medium text-gray-500">Format:</span>{" "}
                                  {product.manifest.contentType} ({product.manifest.version})
                                </p>
                                {product.manifest.device && (
                                  <p className="text-gray-600 dark:text-gray-300">
                                    <span className="font-medium text-gray-500">Device:</span>{" "}
                                    {product.manifest.device}
                                  </p>
                                )}
                              </div>

                              {/* TEE Attestation Info */}
                              <div className="p-3.5 rounded-xl bg-white dark:bg-darkblue border border-gray-200 dark:border-white/10 space-y-2">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                  <Cpu className="w-4 h-4 text-purple-500" />
                                  TEE Enclave Attestation
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  <span className="font-medium text-gray-500">Enclave:</span>{" "}
                                  {product.attestation.enclaveId}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300">
                                  <span className="font-medium text-gray-500">Verifier:</span>{" "}
                                  {product.attestation.verifier}
                                </p>
                                <p className="text-gray-600 dark:text-gray-300 font-mono text-[11px] truncate">
                                  <span className="font-sans font-medium text-gray-500">Quote Hash:</span>{" "}
                                  {truncate(product.attestation.quoteHash, 10, 8)}
                                </p>
                              </div>

                              {/* On-Chain Certificate Info */}
                              <div className="p-3.5 rounded-xl bg-white dark:bg-darkblue border border-gray-200 dark:border-white/10 space-y-2">
                                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                                  <Award className="w-4 h-4 text-emerald-500" />
                                  Stellar Smart Contract Certificate
                                </p>
                                {product.certificate ? (
                                  <>
                                    <p className="text-gray-600 dark:text-gray-300">
                                      <span className="font-medium text-gray-500">ID:</span>{" "}
                                      {product.certificate.certificateId}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300">
                                      <span className="font-medium text-gray-500">Network:</span>{" "}
                                      {product.certificate.network}
                                    </p>
                                    <a
                                      href={`https://stellar.expert/explorer/public/tx/${product.certificate.stellarTxHash}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
                                    >
                                      Stellar Explorer Tx <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 italic">
                                    Certificate pending smart contract finalization.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={product.status} />
                </div>
                <div className="absolute bottom-2 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono text-white">
                  {product.requestId}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    by {product.creator}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-2">
                    {product.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Content Hash:</span>
                    <CopyBtn value={product.verificationHash} label="Hash" />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "manifest", product })}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium hover:bg-blue-100 transition"
                    >
                      Manifest
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: "attestation", product })}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium hover:bg-purple-100 transition"
                    >
                      TEE Proof
                    </button>
                    {product.certificate && (
                      <Link
                        href={product.certificate.certificateUrl}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 transition"
                      >
                        Certificate
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Manifest & TEE Proof JSON Inspection */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveModal(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-darkblue rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {activeModal.type === "manifest" ? (
                  <>
                    <FileCode className="w-5 h-5 text-blue-500" />
                    Manifest Details — {activeModal.product.name}
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5 text-purple-500" />
                    TEE Attestation Report — {activeModal.product.name}
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-80 shadow-inner">
              <pre>
                {JSON.stringify(
                  activeModal.type === "manifest"
                    ? activeModal.product.manifest
                    : activeModal.product.attestation,
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
