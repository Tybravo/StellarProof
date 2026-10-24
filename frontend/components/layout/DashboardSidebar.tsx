"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useModal } from "@/components/ui/ModalProvider";
import { ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { useAuth } from "@/app/context/AuthContext";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const LINKS: SidebarLink[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/assets", label: "Assets", icon: Package },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/** Returns true when `href` matches the current route, or is an ancestor of it. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { openModal, closeModal } = useModal();
  const { logout } = useAuth();

  const handleSignOutClick = () => {
    openModal(
      <>
        <ModalHeader>Sign out</ModalHeader>
        <ModalBody>Are you sure you want to sign out of your dashboard?</ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              closeModal();
              logout();
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Sign out
          </button>
        </ModalFooter>
      </>
    );
    onNavigate?.();
  };

  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-1 p-4">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              active
                ? "bg-primary/10 text-primary dark:bg-primary/15"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={handleSignOutClick}
        className={cn(
          "mt-2 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200",
          "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        )}
      >
        <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </nav>
  );
}

/**
 * Global navigation sidebar for authenticated dashboard routes.
 *
 * Renders as a fixed, always-visible column on desktop (lg and up) and
 * collapses into a slide-out drawer triggered by a menu button on
 * smaller viewports, matching the mobile-menu pattern used by `Header`.
 */
export default function DashboardSidebar() {
  const pathname = usePathname() ?? "/dashboard";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Dashboard sidebar"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:border-r lg:border-gray-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-darkblue/60"
      >
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile menu toggle */}
      <button
        type="button"
        className="fixed top-4 left-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue text-gray-700 dark:text-white shadow-sm transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
        aria-expanded={mobileOpen}
        aria-controls="dashboard-mobile-sidebar"
        aria-label={mobileOpen ? "Close dashboard menu" : "Open dashboard menu"}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              id="dashboard-mobile-sidebar"
              role="dialog"
              aria-label="Dashboard navigation"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-darkblue shadow-xl lg:hidden"
            >
              <div className="flex items-center justify-end p-2">
                <button
                  type="button"
                  aria-label="Close dashboard navigation"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
