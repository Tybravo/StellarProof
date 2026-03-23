"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useWallet } from "@/context/WalletContext";
import { useWizard } from "@/context/WizardContext";

const authService = {
  login: async (email: string, password: string): Promise<{ token: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (email === "test@stellarproof.com" && password === "password123") {
      return { token: "mock_token_xyz" };
    }
    throw new Error("Invalid credentials");
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { disconnect } = useWallet();
  const { reset } = useWizard();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = () => {
    if (!email) {
      setEmailError("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError("Password is required");
    } else {
      setPasswordError("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("session_token");
    sessionStorage.removeItem("session_token");
    localStorage.removeItem("freighter_public_key");
    localStorage.removeItem("walletConnected");
    disconnect();
    reset();
    addToast({ type: "success", message: "You have been logged out successfully" });
    router.push("/login");
  };

  if (typeof window !== "undefined") {
    (window as Window & { __stellarproof_logout?: () => void }).__stellarproof_logout = handleLogout;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    validateEmail();
    validatePassword();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) return;
    setIsLoading(true);
    try {
      const { token } = await authService.login(email, password);
      if (rememberMe) {
        localStorage.setItem("session_token", token);
      } else {
        sessionStorage.setItem("session_token", token);
      }
      addToast({ type: "success", message: "Welcome back!" });
      router.push("/dashboard");
    } catch {
      addToast({
        type: "error",
        message: "Authentication failed. Please check your credentials.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const emailInputClass = emailError
    ? "w-full px-4 py-2.5 rounded-lg border border-red-500 text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
    : "w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition";

  const passwordInputClass = passwordError
    ? "w-full px-4 py-2.5 rounded-lg border border-red-500 text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition pr-10"
    : "w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition pr-10";

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4">
      <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">StellarProof</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sign in to your account
          </p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validateEmail}
              placeholder="you@example.com"
              className={emailInputClass}
            />
            {emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={validatePassword}
                placeholder="••••••••"
                className={passwordInputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-500 text-xs mt-1">{passwordError}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-primary"
              />
              Remember me
            </label>
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-button-glow"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-primary font-medium hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  );
}