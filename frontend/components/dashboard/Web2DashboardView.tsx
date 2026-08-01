"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  web2DashboardService,
  type Web2UserProduct,
  type MockVerificationRequest,
  type MockManifest,
  type MockAttestation,
  type MockCertificate,
} from "@/services/web2DashboardService";
import QuickActions from "./QuickActions";
import { Search, ShieldCheck, FileCode, Award, CheckCircle2, Clock, AlertTriangle, ExternalLink, X, Eye } from "lucide-react";

export interface Web2DashboardViewProps {
  userEmail?: string;
  userName?: string;
}

type TabType = "products" | "requests" | "manifests" | "certificates";

function truncateHash(hash: string): string {
  if (!hash || hash.length < 16) return hash || "";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

function StatusBadge({ status }: { status: string }) {
  let badgeStyle = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  let icon = <Clock className="w-3.5 h-3.5 mr-1 inline" />;

  if (status === "verified" || status === "active") {
    badgeStyle = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800";
    icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />;
  } else if (status === "pending" || status === "processing") {
    badgeStyle = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
    icon = <Clock className="w-3.5 h-3.5 mr-1 inline" />;
  } else if (status === "failed" || status === "revoked") {
    badgeStyle = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    icon = <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${badgeStyle}`}>
      {icon}
      {status}
    </span>
  );
}

export default function Web2DashboardView({ userEmail = "user@example.com", userName }: Web2DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("products"); // Default view is "My Products"
  const [products, setProducts] = useState<Web2UserProduct[]>([]);
  const [requests, setRequests] = useState<MockVerificationRequest[]>([]);
  const [manifests, setManifests] = useState<MockManifest[]>([]);
  const [attestations, setAttestations] = useState<MockAttestation[]>([]);
  const [certificates, setCertificates] = useState<MockCertificate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedInspectItem, setSelectedInspectItem] = useState<{ title: string; data: Record<string, unknown> } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [prodRes, reqRes, mnfRes, attRes, certRes] = await Promise.all([
          web2DashboardService.getWeb2UserProducts(userEmail),
          web2DashboardService.getWeb2VerificationRequests(userEmail),
          web2DashboardService.getWeb2Manifests(userEmail),
          web2DashboardService.getWeb2Attestations(userEmail),
          web2DashboardService.getWeb2Certificates(userEmail),
        ]);

        if (isMounted) {
          setProducts(prodRes);
          setRequests(reqRes);
          setManifests(mnfRes);
          setAttestations(attRes);
          setCertificates(certRes);
        }
      } catch (err) {
        console.error("Failed to load web2 dashboard data:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  // Filter logic based on tab & searchQuery
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p: Web2UserProduct) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.contentHash.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const q = searchQuery.toLowerCase();
    return requests.filter(
      (r: MockVerificationRequest) =>
        r.productName.toLowerCase().includes(q) ||
        r.requestId.toLowerCase().includes(q) ||
        r.contentHash.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  const filteredManifests = useMemo(() => {
    if (!searchQuery) return manifests;
    const q = searchQuery.toLowerCase();
    return manifests.filter(
      (m: MockManifest) =>
        m.title.toLowerCase().includes(q) ||
        m.manifestId.toLowerCase().includes(q) ||
        m.contentHash.toLowerCase().includes(q)
    );
  }, [manifests, searchQuery]);

  const filteredCertificates = useMemo(() => {
    if (!searchQuery) return certificates;
    const q = searchQuery.toLowerCase();
    return certificates.filter(
      (c: MockCertificate) =>
        c.certificateId.toLowerCase().includes(q) ||
        c.recipientEmail.toLowerCase().includes(q) ||
        c.manifestHash.toLowerCase().includes(q)
    );
  }, [certificates, searchQuery]);

  // Handle Quick Action clicks
  const handleQuickAction = (tabName: string) => {
    if (tabName === "products") {
      setActiveTab("products");
      setCurrentPage(1);
    } else if (tabName === "verify") {
      setActiveTab("requests");
      setCurrentPage(1);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-r from-blue-900/10 via-primary/5 to-purple-900/10 dark:from-darkblue dark:via-darkblue-dark dark:to-darkblue p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Email Authenticated
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Web2 User Dashboard</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Welcome back{userName ? `, ${userName}` : ""}, <span className="text-primary">{userEmail}</span>
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your verified content, manifests, attestations, and digital product certificates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow hover:bg-primary-dark transition"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify New Content
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <QuickActions activeTab={activeTab} onSelectTab={handleQuickAction} />

      {/* View Navigation Tabs & Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 dark:border-white/10 pb-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-my-products"
            onClick={() => {
              setActiveTab("products");
              setCurrentPage(1);
            }}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "products"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            My Products ({products.length})
          </button>

          <button
            id="tab-verification-requests"
            onClick={() => {
              setActiveTab("requests");
              setCurrentPage(1);
            }}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "requests"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Verification Requests ({requests.length})
          </button>

          <button
            id="tab-manifests-attestations"
            onClick={() => {
              setActiveTab("manifests");
              setCurrentPage(1);
            }}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "manifests"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Manifests & Attestations ({manifests.length})
          </button>

          <button
            id="tab-certificates"
            onClick={() => {
              setActiveTab("certificates");
              setCurrentPage(1);
            }}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "certificates"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            Certificates ({certificates.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Content Areas */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : activeTab === "products" ? (
        /* ================= Default View: My Products ================= */
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              My Verified Products
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No digital products found.</p>
              <Link
                href="/verify"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark"
              >
                Verify New Product
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product: Web2UserProduct) => (
                <div
                  key={product.id}
                  className="flex flex-col rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue overflow-hidden shadow-sm hover:shadow-md transition"
                >
                  <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={product.status} />
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-primary font-medium mb-1">
                        <span>{product.category}</span>
                        <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                        {product.name}
                      </h3>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/10 pt-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 font-mono">
                        <span>Content Hash:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {truncateHash(product.contentHash)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                        <span>Manifest:</span>
                        <button
                          onClick={() =>
                            setSelectedInspectItem({
                              title: `Manifest: ${product.manifest.manifestId}`,
                              data: product.manifest as unknown as Record<string, unknown>,
                            })
                          }
                          className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                        >
                          <FileCode className="w-3 h-3" />
                          {product.manifest.manifestId}
                        </button>
                      </div>

                      {product.certificate && (
                        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                          <span>Certificate:</span>
                          <Link
                            href={`/certificate?id=${product.certificate.certificateId}`}
                            className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <Award className="w-3.5 h-3.5" />
                            {product.certificate.certificateId}
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() =>
                          setSelectedInspectItem({
                            title: `Product Provenance details: ${product.name}`,
                            data: product as unknown as Record<string, unknown>,
                          })
                        }
                        className="w-full py-2 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Provenance
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === "requests" ? (
        /* ================= Verification Requests View ================= */
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Product Verification Requests
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredRequests.length} Request{filteredRequests.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-left">
              <thead className="bg-gray-50 dark:bg-white/5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Request ID</th>
                  <th className="px-6 py-3">Product Name</th>
                  <th className="px-6 py-3">Submitted Date</th>
                  <th className="px-6 py-3">Content Hash</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10 text-sm">
                {filteredRequests.map((req: MockVerificationRequest) => (
                  <tr key={req.requestId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-mono text-gray-900 dark:text-white font-semibold">
                      {req.requestId}
                    </td>
                    <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">
                      {req.productName}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(req.requestDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                      {truncateHash(req.contentHash)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          setSelectedInspectItem({
                            title: `Request Details: ${req.requestId}`,
                            data: req as unknown as Record<string, unknown>,
                          })
                        }
                        className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filteredRequests.map((req: MockVerificationRequest) => (
              <div
                key={req.requestId}
                className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue p-4 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {req.requestId}
                  </span>
                  <StatusBadge status={req.status} />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{req.productName}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Hash: {truncateHash(req.contentHash)}
                </p>
                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-gray-400">{new Date(req.requestDate).toLocaleDateString()}</span>
                  <button
                    onClick={() =>
                      setSelectedInspectItem({
                        title: `Request Details: ${req.requestId}`,
                        data: req as unknown as Record<string, unknown>,
                      })
                    }
                    className="text-primary font-semibold hover:underline"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeTab === "manifests" ? (
        /* ================= Manifests & Attestations View ================= */
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Manifests & Oracle Attestations
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredManifests.length} Manifests
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10 text-left">
              <thead className="bg-gray-50 dark:bg-white/5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Manifest ID</th>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Schema</th>
                  <th className="px-6 py-3">Content Hash</th>
                  <th className="px-6 py-3">Attestation Status</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10 text-sm">
                {filteredManifests.map((m: MockManifest) => {
                  const linkedAtt = attestations.find((a: MockAttestation) => a.manifestId === m.manifestId);
                  return (
                    <tr key={m.manifestId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <td className="px-6 py-4 font-mono text-gray-900 dark:text-white font-semibold">
                        {m.manifestId}
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{m.title}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {m.schemaVersion}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                        {truncateHash(m.contentHash)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={linkedAtt?.status || "pending"} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            setSelectedInspectItem({
                              title: `Manifest & Attestation JSON: ${m.manifestId}`,
                              data: { manifest: m, attestation: linkedAtt },
                            })
                          }
                          className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                        >
                          View JSON
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filteredManifests.map((m: MockManifest) => {
              const linkedAtt = attestations.find((a: MockAttestation) => a.manifestId === m.manifestId);
              return (
                <div
                  key={m.manifestId}
                  className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {m.manifestId}
                    </span>
                    <StatusBadge status={linkedAtt?.status || "pending"} />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{m.title}</h4>
                  <div className="pt-2 flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-mono">Schema: {m.schemaVersion}</span>
                    <button
                      onClick={() =>
                        setSelectedInspectItem({
                          title: `Manifest Details: ${m.manifestId}`,
                          data: { manifest: m, attestation: linkedAtt },
                        })
                      }
                      className="text-primary font-semibold hover:underline"
                    >
                      Inspect JSON →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* ================= Certificates View ================= */
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Digital Certificates
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredCertificates.length} Certificates
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCertificates.map((cert: MockCertificate) => (
              <div
                key={cert.certificateId}
                className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue p-6 shadow-sm hover:shadow-md transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                      {cert.certificateId}
                    </span>
                  </div>
                  <StatusBadge status={cert.status} />
                </div>

                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 border-t border-b border-gray-100 dark:border-white/10 py-3">
                  <div className="flex justify-between">
                    <span>Issuer:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cert.issuer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipient:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cert.recipientEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Issued Date:</span>
                    <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Manifest Hash:</span>
                    <span>{truncateHash(cert.manifestHash)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/certificate?id=${cert.certificateId}`}
                    className="w-full py-2 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition text-center inline-flex items-center justify-center gap-1 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Certificate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* JSON Inspector Modal */}
      {selectedInspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-darkblue p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedInspectItem.title}
              </h3>
              <button
                onClick={() => setSelectedInspectItem(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-gray-900 p-4 font-mono text-xs text-green-400">
              <pre>{JSON.stringify(selectedInspectItem.data, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedInspectItem(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
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
