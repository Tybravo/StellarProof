"use client";

import { 
  Skeleton, 
  TextSkeleton, 
  CardSkeleton, 
  TableSkeleton, 
  WizardSkeleton 
} from "../../components/ui/Skeleton";
import Header from "../../components/Header";

export default function SkeletonDemo() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-24 space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Base & Text Skeletons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Base Elements</h3>
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Multiline Text</h3>
              <TextSkeleton lines={4} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Card Skeletons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Table Skeleton</h2>
          <TableSkeleton rows={6} />
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Wizard Skeleton</h2>
          <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-xl">
             <WizardSkeleton />
          </div>
        </section>
      </main>
    </div>
  );
}
