"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useWallet } from "@/context/WalletContext";
import { useWizard } from "@/context/WizardContext";
import { useAuth } from "@/app/context/AuthContext";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { disconnect } = useWallet();
  const { reset } = useWizard();
  const { logout } = useAuth();

  const handleLogout = React.useCallback(() => {
    logout();
    disconnect();
    reset();
    addToast({ type: "success", message: "You have been logged out successfully" });
    router.push("/login");
  }, [logout, disconnect, reset, addToast, router]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as Window & { __stellarproof_logout?: () => void }).__stellarproof_logout = handleLogout;
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as Window & { __stellarproof_logout?: () => void }).__stellarproof_logout;
      }
    };
  }, [handleLogout]);

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4">
      <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">StellarProof</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in to your account
          </p>
        </div>
        
        <LoginForm />

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-primary font-medium hover:underline">
            Register
          </a>
        </p>
      </div>
    </main>
  );
}
