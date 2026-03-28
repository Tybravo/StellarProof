"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  Palette,
  Music,
  Camera,
  Video,
  Package,
  Briefcase,
  User,
  Award,
  Scale,
  Lightbulb,
  BookOpen,
  GraduationCap,
  FileText,
  SearchX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// import Header from "@/components/Header";
// import ManifestGeneratorModal from "@/components/ManifestGeneratorModal";

import Header from "../../components/Header";
import ManifestGeneratorModal from "../../components/ManifestGeneratorModal";
import {
  manifestUseCaseService,
  CATEGORIES,
  type ManifestUseCase,
  type Category,
} 
// from "@/services/manifestUseCases";
from "../../services/manifestUseCases";

const ICON_MAP: Record<string, React.ElementType> = {
  Palette,
  Music,
  Camera,
  Video,
  Package,
  Briefcase,
  User,
  Award,
  Scale,
  Lightbulb,
  BookOpen,
  GraduationCap,
  FileText,
};

const CATEGORY_COLORS: Record<Exclude<Category, "All">, string> = {
  Creative: "text-secondary bg-secondary/10 dark:bg-secondary/15",
  Business: "text-primary bg-primary/10 dark:bg-primary/15",
  Identity: "text-accent bg-accent/10 dark:bg-accent/15",
  Legal: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20",
  Academic: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20",
};

function UseCaseCard({
  useCase,
  onGenerate,
}: {
  useCase: ManifestUseCase;
  onGenerate: (uc: ManifestUseCase) => void;
}) {
  const Icon = ICON_MAP[useCase.icon] ?? FileText;
  const badgeClass = CATEGORY_COLORS[useCase.category];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm hover:shadow-md dark:hover:shadow-glow transition-shadow duration-200"
    >
      {/* Icon + badge row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20">
          <Icon className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
        >
          {useCase.category}
        </span>
      </div>

      {/* Title + description */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
        {useCase.title}
      </h3>
      <p className="flex-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
        {useCase.description}
      </p>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onGenerate(useCase)}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow hover:shadow-glow transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue"
      >
        Generate Manifest
      </button>
    </motion.article>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="col-span-full flex flex-col items-center gap-4 py-20 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
        <SearchX className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Try a different search term or select a different category.
        </p>
      </div>
    </motion.div>
  );
}

export default function ManifestPage() {
  const [allUseCases, setAllUseCases] = useState<ManifestUseCase[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedUseCase, setSelectedUseCase] = useState<ManifestUseCase | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    manifestUseCaseService.getAll().then((data) => {
      setAllUseCases(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = allUseCases;

    if (activeCategory !== "All") {
      result = result.filter((uc) => uc.category === activeCategory);
    }

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (uc) =>
          uc.title.toLowerCase().includes(q) ||
          uc.description.toLowerCase().includes(q) ||
          uc.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allUseCases, search, activeCategory]);

  const handleGenerate = useCallback((uc: ManifestUseCase) => {
    setSelectedUseCase(uc);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedUseCase(null);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] font-sans selection:bg-primary/30">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Page heading */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            Manifest Generator
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-500 dark:text-gray-400">
            Choose a use-case below to generate a tamper-proof manifest anchored to the Stellar
            blockchain.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6 max-w-xl mx-auto">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Search use-cases"
            placeholder="Search use-cases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>

        {/* Category filter chips */}
        <div
          role="tablist"
          aria-label="Filter by category"
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                role="tab"
                aria-selected={isActive}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-[#020617] ${
                  isActive
                    ? "bg-primary text-white shadow-button-glow"
                    : "border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? (
                filtered.map((uc) => (
                  <UseCaseCard key={uc.id} useCase={uc} onGenerate={handleGenerate} />
                ))
              ) : (
                <EmptyState key="empty" query={search || activeCategory} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <ManifestGeneratorModal
        open={modalOpen}
        useCase={selectedUseCase}
        onClose={handleCloseModal}
      />
    </div>
  );
}
