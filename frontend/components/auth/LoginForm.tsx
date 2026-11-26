"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/app/context/AuthContext";
import { AuthApiError } from "@/services/auth";
import { loginSchema, type LoginFormValues } from "@/utils/authSchemas";

export default function LoginForm() {
  const router = useRouter();
  const { addToast } = useToast();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      addToast({ type: "success", message: "Welcome back!" });
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof AuthApiError && err.status === 401
          ? "Authentication failed. Please check your credentials."
          : err instanceof AuthApiError
            ? err.message
            : "Something went wrong. Please try again.";
      addToast({ type: "error", message });
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    "w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition";
  const inputNormal = `${inputBase} border-gray-300 dark:border-gray-600 focus:ring-primary`;
  const inputError = `${inputBase} border-red-500 focus:ring-red-500`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 w-full">
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
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={errors.email ? inputError : inputNormal}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-red-500 text-xs mt-1">
            {errors.email.message}
          </p>
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
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`${errors.password ? inputError : inputNormal} pr-10`}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-controls="password"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <span aria-hidden="true">{showPassword ? "Hide" : "Show"}</span>
          </button>
        </div>
        {errors.password && (
          <p id="password-error" role="alert" className="text-red-500 text-xs mt-1">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="flex items-center justify-end">
        <a href="/forget-password" className="text-sm text-primary hover:underline">
          Forgot your password?
        </a>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        aria-label={isLoading ? "Signing in, please wait" : "Sign in"}
        aria-busy={isLoading}
        className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-button-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span aria-hidden="true">Signing in...</span>
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
