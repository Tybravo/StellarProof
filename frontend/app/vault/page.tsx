"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileKey2,
  Lock,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import Header from "../../components/Header";
import { useWallet } from "@/context/WalletContext";
import { cn } from "../../utils/cn";

/* ------------------------------------------------------------------ */
/*                          Mock service layer                         */
/* ------------------------------------------------------------------ */

export type VaultItemStatus = "encrypted" | "pending" | "minted";

export interface VaultItem {
  id: string;
  storageId: string;
  filename: string;
  date: string; // ISO date string
  size: number; // bytes
  status: VaultItemStatus;
  certificateUrl?: string;
}

const MOCK_VAULT_ITEMS: VaultItem[] = [
  {
    id: "1",
    storageId: "SPV-7F3A9C2E-001",
    filename: "contract_v3_final.pdf",
    date: "2026-03-20",
    size: 2_457_600,
    status: "minted",
    certificateUrl: "#",
  },
  {
    id: "2",
    storageId: "SPV-4B8D1F5A-002",
    filename: "media_asset_promo.mp4",
    date: "2026-03-18",
    size: 52_428_800,
    status: "encrypted",
  },
  {
    id: "3",
    storageId: "SPV-2C6E0A7D-003",
    filename: "audit_report_q1.xlsx",
    date: "2026-03-15",
    size: 819_200,
    status: "minted",
    certificateUrl: "#",
  },
  {
    id: "4",
    storageId: "SPV-9A1B4C8F-004",
    filename: "source_code_snapshot.zip",
    date: "2026-03-12",
    size: 8_388_608,
    status: "pending",
  },
  {
    id: "5",
    storageId: "SPV-3D5E2F0B-005",
    filename: "identity_document.jpg",
    date: "2026-03-10",
    size: 1_048_576,
    status: "encrypted",
  },
  {
    id: "6",
    storageId: "SPV-6C9A3B1D-006",
    filename: "research_paper_draft.docx",
    date: "2026-03-07",
    size: 614_400,
    status: "minted",
    certificateUrl: "#",
  },
  {
    id: "7",
    storageId: "SPV-0F2E8D4C-007",
    filename: "product_design_v2.fig",
    date: "2026-03-05",
    size: 5_242_880,
    status: "encrypted",
  },
  {
    id: "8",
    storageId: "SPV-5A7C1E9B-008",
    filename: "legal_agreement_signed.pdf",
    date: "2026-03-01",
    size: 3_145_728,
    status: "pending",
  },
  {
    id: "9",
    storageId: "SPV-8B4F6A2C-009",
    filename: "nft_artwork_edition1.png",
    date: "2026-02-25",
    size: 4_194_304,
    status: "minted",
    certificateUrl: "#",
  },
  {
    id: "10",
    storageId: "SPV-1D3C7E5F-010",
    filename: "financial_statement_fy25.pdf",
    date: "2026-02-20",
    size: 2_097_152,
    status: "encrypted",
  },
  {
    id: "11",
    storageId: "SPV-2E4D8F6A-011",
    filename: "marketing_brief.pptx",
    date: "2026-02-15",
    size: 7_340_032,
    status: "pending",
  },
  {
    id: "12",
    storageId: "SPV-7F9B3C1E-012",
    filename: "software_license_key.txt",
    date: "2026-02-10",
    size: 4_096,
    status: "encrypted",
  },
];

/* ------------------------------------------------------------------ */
/*                             Helpers                                 */
/* ------------------------------------------------------------------ */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

const STATUS_CONFIG: Record<
  VaultItemStatus,
  { label: string; className: string }
> = {
  encrypted: {
    label: "Encrypted",
    className:
      "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  },
  pending: {
    label: "Pending",
    className:
      "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
  },
  minted: {
    label: "Minted",
    className:
      "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
};

const PAGE_SIZE = 8;

/* ------------------------------------------------------------------ */
/*                         Sub-components                              */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: VaultItemStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        cfg.className
      )}
    >
      {status === "encrypted" && <Lock className="w-2.5 h-2.5" aria-hidden />}
      {status === "minted" && <ShieldCheck className="w-2.5 h-2.5" aria-hidden />}
      {cfg.label}
    </span>
  );
}

/* ---- Wallet Guard -------------------------------------------------- */

function WalletGuard({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <Wallet className="w-7 h-7 text-primary" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Connect Your Wallet
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        You need to connect your Freighter wallet to access your Secret
        Provenance Vault.
      </p>
      <button
        type="button"
        onClick={onConnect}
        className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
          hover:bg-primary-dark transition-colors shadow-button-glow"
      >
        Connect Wallet
      </button>
    </div>
  );
}

/* ---- Empty State --------------------------------------------------- */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-center mb-5">
        <FileKey2 className="w-7 h-7 text-secondary" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Your Vault is Empty
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
        No encrypted assets found. Start an SPV verification to securely store
        your first file.
      </p>
      <a
        href="/verify"
        className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
          hover:bg-primary-dark transition-colors shadow-button-glow"
      >
        Start SPV Verification
      </a>
    </div>
  );
}

/* ---- Vault Table Row ----------------------------------------------- */

interface RowProps {
  item: VaultItem;
}

function VaultRow({ item }: RowProps) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
      {/* Storage ID */}
      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {item.storageId}
      </td>
      {/* Filename */}
      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-100 max-w-[180px]">
        <span title={item.filename}>{truncate(item.filename, 28)}</span>
      </td>
      {/* Date */}
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {formatDate(item.date)}
      </td>
      {/* Size */}
      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap tabular-nums">
        {formatSize(item.size)}
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={item.status} />
      </td>
      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <ActionButton
            icon={<Download className="w-3.5 h-3.5" />}
            label="Download Encrypted"
            onClick={() => {}}
          />
          <ActionButton
            icon={<Eye className="w-3.5 h-3.5" />}
            label="Decrypt Preview"
            onClick={() => {}}
          />
          {item.status === "minted" && item.certificateUrl && (
            <ActionButton
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              label="View Certificate"
              onClick={() => {}}
              accent
            />
          )}
        </div>
      </td>
    </tr>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}

function ActionButton({ icon, label, onClick, accent }: ActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        accent
          ? "text-primary hover:bg-primary/10"
          : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10"
      )}
    >
      {icon}
    </button>
  );
}

/* ---- Pagination ---------------------------------------------------- */

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}

function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-2">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p as number)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
              p === page
                ? "bg-primary text-white shadow-button-glow"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                           Main Page                                 */
/* ------------------------------------------------------------------ */

export default function VaultPage() {
  const { isConnected, connect } = useWallet();

  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_VAULT_ITEMS.filter((item) => {
      if (q && !item.storageId.toLowerCase().includes(q) && !item.filename.toLowerCase().includes(q)) {
        return false;
      }
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      return true;
    });
  }, [query, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handlePageChange(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function handleFilterChange<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const hasFilters = query !== "" || dateFrom !== "" || dateTo !== "";

  function clearFilters() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkblue-dark">
      <Header />

      <main id="main-content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileKey2 className="w-4 h-4 text-primary" aria-hidden />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Secret Provenance Vault
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-10">
              Manage your encrypted assets stored on the Stellar network.
            </p>
          </div>

          {isConnected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              Vault Active
            </span>
          )}
        </div>

        {!isConnected ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60">
            <WalletGuard onConnect={connect} />
          </div>
        ) : (
          <div className="space-y-4">

            {/* Controls */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4 space-y-4">

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => handleFilterChange(setQuery)(e.target.value)}
                  placeholder="Search by Storage ID or filename…"
                  aria-label="Search vault"
                  className={cn(
                    "w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border",
                    "bg-white dark:bg-darkblue-dark",
                    "text-gray-800 dark:text-gray-100",
                    "placeholder-gray-400 dark:placeholder-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors"
                  )}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => handleFilterChange(setQuery)("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { id: "vault-from", label: "From", value: dateFrom, setter: setDateFrom, max: dateTo || undefined },
                    { id: "vault-to", label: "To", value: dateTo, setter: setDateTo, min: dateFrom || undefined },
                  ] as const
                ).map(({ id, label, value, setter, ...rest }) => (
                  <div key={id} className="flex flex-col gap-1">
                    <label htmlFor={id} className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" aria-hidden />
                      <input
                        id={id}
                        type="date"
                        value={value}
                        onChange={(e) => handleFilterChange(setter)(e.target.value)}
                        {...rest}
                        className={cn(
                          "pl-8 pr-3 py-2 text-xs rounded-lg border w-full",
                          "bg-white dark:bg-darkblue-dark",
                          "text-gray-800 dark:text-gray-100",
                          "border-gray-300 dark:border-gray-600",
                          "focus:outline-none focus:ring-2 focus:ring-primary/60 transition-colors"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Clear */}
              {hasFilters && (
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {/* Table / empty state */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 overflow-hidden">
              {pageItems.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left" aria-label="Vault items">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02]">
                          {[
                            "Storage ID",
                            "Filename",
                            "Date",
                            "Size",
                            "Status",
                            "Actions",
                          ].map((h) => (
                            <th
                              key={h}
                              scope="col"
                              className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item) => (
                          <VaultRow key={item.id} item={item} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer: count + pagination */}
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Showing{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {(safePage - 1) * PAGE_SIZE + 1}–
                        {Math.min(safePage * PAGE_SIZE, filtered.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {filtered.length}
                      </span>{" "}
                      items
                    </p>
                    <Pagination
                      page={safePage}
                      totalPages={totalPages}
                      onPage={handlePageChange}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
