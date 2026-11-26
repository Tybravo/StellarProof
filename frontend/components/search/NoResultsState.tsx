import React from "react";
import { SearchX } from "lucide-react";
import { cn } from "@/utils/cn";

interface NoResultsStateProps {
  /** The search term that produced no results, shown for context. */
  query?: string;
  /** Optional class name applied to the outer container. */
  className?: string;
  onClearFilters?: () => void;
}

export default function NoResultsState({ query, className, onClearFilters }: NoResultsStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        "rounded-2xl border-2 border-dashed",
        "border-gray-200 dark:border-white/10",
        "bg-gray-50/50 dark:bg-white/[0.02]",
        className,
      )}
      role="status"
      data-testid="search-no-results"
    >
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-gray-400" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        No results found
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        {query ? (
          <>
            We couldn&apos;t find anything matching{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              &quot;{query}&quot;
            </span>
            . Try adjusting your search or filters.
          </>
        ) : (
          "We couldn't find anything matching your search. Try adjusting your search or filters."
        )}
      </p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 rounded-md px-3 py-1.5 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Clear search filters
        </button>
      )}
    </div>
  );
}
