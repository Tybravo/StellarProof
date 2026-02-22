"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  {
    label: "Ecosystem",
    children: [
      { href: "#creator", label: "Creator" },
      { href: "#developer", label: "Developer" },
    ],
  },
  {
    label: "Instances",
    children: [
      { href: "#assets", label: "Assets" },
      { href: "#use-cases", label: "Use Cases" },
    ],
  },
  { href: "#pricing", label: "Pricing" },
] as const;

function scrollToSection(hash: string) {
  const el = document.querySelector(hash);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LogoIcon() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      style={{
        background: "linear-gradient(135deg, #ff7ce9 0%, #60a5fa 100%)",
      }}
      aria-hidden
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
          fill="white"
        />
        <path
          d="M9 12l2 2 4-4"
          stroke="#012254"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("#home");

  const handleNavClick = useCallback((href?: string) => {
    if (href) scrollToSection(href);
    setMobileOpen(false);
    setMobileDropdown(null);
  }, []);

  useEffect(() => {
    const sectionIds = [
      "#home", "#about", "#creator", "#developer",
      "#assets", "#use-cases", "#pricing",
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = "#" + (entry.target as HTMLElement).id;
            if (sectionIds.includes(id)) setActiveSection(id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );
    sectionIds.forEach((id) => {
      const el = document.querySelector(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-white/20 bg-white dark:bg-darkblue shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2)] transition-colors duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <a
          href="#home"
          onClick={(e) => { e.preventDefault(); scrollToSection("#home"); }}
          className="flex shrink-0 items-center gap-2.5 outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue"
        >
          <LogoIcon />
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-primary">Stellar</span>
            <span className="text-secondary">Proof</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((item) =>
              "href" in item ? (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={(e) => { e.preventDefault(); scrollToSection(item.href); }}
                    className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue ${
                      activeSection === item.href
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {item.label}
                    {activeSection === item.href && (
                      <span
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-[calc(100%+8px)] border-b-2 border-secondary"
                        aria-hidden
                      />
                    )}
                  </a>
                </li>
              ) : (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-white/80 transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue"
                    aria-expanded={openDropdown === item.label}
                    aria-haspopup="true"
                    aria-controls={`dropdown-${item.label.toLowerCase()}`}
                    id={`menubutton-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${openDropdown === item.label ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  <AnimatePresence>
                    {openDropdown === item.label && (
                      <motion.ul
                        id={`dropdown-${item.label.toLowerCase()}`}
                        role="menu"
                        aria-labelledby={`menubutton-${item.label.toLowerCase()}`}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full pt-1"
                      >
                        <li className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue/95 shadow-lg backdrop-blur-md">
                          <ul className="min-w-[160px] py-1">
                            {item.children.map((child) => (
                              <li key={child.href} role="none">
                                <a
                                  href={child.href}
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    scrollToSection(child.href);
                                    setOpenDropdown(null);
                                  }}
                                  className="block px-4 py-2 text-sm text-gray-700 dark:text-white/90 transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white focus-visible:bg-gray-100 dark:focus-visible:bg-white/10 focus-visible:outline-none"
                                >
                                  {child.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </li>
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              )
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-2">

          <ThemeToggle />

          <Link
            href="/creator/upload-content"
            className="hidden rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-button-glow transition hover:shadow-glow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue sm:inline-block"
          >
            Launch App
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 dark:text-white transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue/98 lg:hidden transition-colors duration-300"
          >
            <nav className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue px-4 py-4 transition-colors duration-300">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((item) =>
                  "href" in item ? (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={(e) => { e.preventDefault(); handleNavClick(item.href); }}
                        className="block rounded-lg px-4 py-3 text-base font-medium text-gray-800 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 touch-manipulation transition-colors duration-300"
                      >
                        {item.label}
                      </a>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-base font-medium text-gray-800 dark:text-white/90 hover:bg-gray-100 dark:hover:bg-white/10 touch-manipulation transition-colors duration-300"
                        aria-expanded={mobileDropdown === item.label}
                        aria-controls={`mobile-dropdown-${item.label.toLowerCase()}`}
                        onClick={() =>
                          setMobileDropdown((d) => d === item.label ? null : item.label)
                        }
                      >
                        {item.label}
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${mobileDropdown === item.label ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </button>
                      <AnimatePresence>
                        {mobileDropdown === item.label && (
                          <motion.ul
                            id={`mobile-dropdown-${item.label.toLowerCase()}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pl-4"
                          >
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <a
                                  href={child.href}
                                  onClick={(e) => { e.preventDefault(); handleNavClick(child.href); }}
                                  className="block rounded-lg py-2.5 pl-2 text-sm text-gray-600 dark:text-white/80 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                                >
                                  {child.label}
                                </a>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  )
                )}
              </ul>
              <div className="mt-4 border-t border-gray-200 dark:border-white/10 pt-4">
                <Link
                  href="/creator/upload-content"
                  className="flex w-full items-center justify-center rounded-lg bg-primary py-3 text-base font-semibold text-white shadow-button-glow transition hover:shadow-glow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkblue"
                  onClick={() => setMobileOpen(false)}
                >
                  Launch App
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}