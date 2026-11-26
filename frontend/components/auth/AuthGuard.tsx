"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  /** Where unauthenticated users are sent. */
  redirectTo?: string;
}

/**
 * Renders `children` only for signed-in users. While the stored session is
 * still being read it shows a loading state; afterwards unauthenticated users
 * are redirected and nothing protected is rendered.
 */
export default function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isInitialized, isAuthenticated, router, redirectTo]);

  if (!isInitialized || !isAuthenticated) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400"
      >
        {isInitialized ? "Redirecting to sign in..." : "Checking your session..."}
      </div>
    );
  }

  return <>{children}</>;
}
