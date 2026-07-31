"use client";

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * Represents the structure of a certificate search result.
 */
export interface Certificate {
  id: string;
  title: string;
  thumbnailUrl: string;
  issuerName: string;
  issueDate: string; // ISO date string
}

interface GridViewProps {
  results: Certificate[];
  isLoading: boolean;
}

/**
 * Formats an ISO date string into a more readable format (e.g., "Jan 1, 2024").
 * @param isoDate - The ISO date string to format.
 * @returns The formatted date string.
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A skeleton loader component displayed while search results are being fetched.
 */
function GridViewSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10"
        >
          <div className="aspect-[4/3] w-full animate-pulse bg-gray-200 dark:bg-white/10" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A component to display when no search results are found.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-20 text-center dark:border-white/15">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        No Certificates Found
      </h3>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Your search did not match any certificates. Try adjusting your search
        terms.
      </p>
    </div>
  );
}

/**
 * A card component to display a single certificate in the grid.
 */
function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <Link href={`/certificate/${certificate.id}`} passHref>
      <article className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-darkblue">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-white/5">
          <Image
            src={certificate.thumbnailUrl}
            alt={certificate.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4">
          <h3
            className="truncate text-sm font-semibold text-gray-900 dark:text-white"
            title={certificate.title}
          >
            {certificate.title}
          </h3>
          <p
            className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400"
            title={certificate.issuerName}
          >
            Issued by: {certificate.issuerName}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatDate(certificate.issueDate)}
          </p>
        </div>
      </article>
    </Link>
  );
}

/**
 * Renders the grid view for global certificate search results.
 * It handles loading and empty states.
 */
export default function GridView({ results, isLoading }: GridViewProps) {
  if (isLoading) {
    return <GridViewSkeleton />;
  }

  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-live="polite"
    >
      {results.map((cert) => (
        <CertificateCard key={cert.id} certificate={cert} />
      ))}
    </div>
  );
}