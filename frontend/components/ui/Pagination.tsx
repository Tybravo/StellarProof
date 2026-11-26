import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages?: number;
  isLoading?: boolean;
  hasNext: boolean;
  onPage: (page: number) => void;
}

const buttonClass = "inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed";

export default function Pagination({ page, totalPages, isLoading, hasNext, onPage }: PaginationProps) {
  const empty = totalPages === 0;
  const valid = Number.isSafeInteger(page) && page >= 1 &&
    (totalPages === undefined || (
      Number.isSafeInteger(totalPages) && totalPages >= 0 && page <= Math.max(1, totalPages)
    ));
  const disabled = isLoading || !valid || empty;

  // Empty collections retain page 1 internally and expose no page navigation.
  const pageLabel = !valid ? "Page unavailable" : empty ? "No pages" :
    totalPages === undefined ? `Page ${page}` : `Page ${page} of ${totalPages}`;

  return (
    <nav aria-label="Asset pagination" className="flex items-center gap-2">
      <button type="button" aria-label="Previous page" className={buttonClass}
        disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous
      </button>
      <span aria-live="polite" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
        {pageLabel}
      </span>
      <button type="button" aria-label="Next page" className={buttonClass}
        disabled={disabled || !hasNext || !Number.isSafeInteger(page + 1) || (totalPages !== undefined && page >= totalPages)} onClick={() => onPage(page + 1)}>
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}
