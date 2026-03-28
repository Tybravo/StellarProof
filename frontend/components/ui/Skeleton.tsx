"use client";

import React from "react";
import { cn } from "../../utils/cn";

/**
 * Base Skeleton component with pulse animation
 */
export const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800", className)}
      {...props}
    />
  );
};

/**
 * Text Skeleton variant
 */
export const TextSkeleton = ({
  lines = 1,
  className,
}: {
  lines?: number;
  className?: string;
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4 w-full",
            i === lines - 1 && lines > 1 && "w-[80%]"
          )}
        />
      ))}
    </div>
  );
};

/**
 * Card Skeleton variant (matches UseCases cards)
 */
export const CardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-6",
        className
      )}
    >
      <Skeleton className="w-16 h-16 rounded-xl" />
      <div className="w-full space-y-3 flex flex-col items-center">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <Skeleton className="w-full h-10 rounded-lg mt-auto" />
    </div>
  );
};

/**
 * Table Skeleton variant (4 columns)
 */
export const TableSkeleton = ({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) => {
  return (
    <div className={cn("w-full border rounded-xl overflow-hidden border-gray-200 dark:border-white/10", className)}>
      <div className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 p-4 grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="divide-y divide-gray-200 dark:divide-white/10">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 grid grid-cols-4 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Wizard/Form Skeleton variant
 */
export const WizardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div className={cn("w-full max-w-xl mx-auto space-y-6", className)}>
      <Skeleton className="h-10 w-1/3 mb-8" />
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
};
