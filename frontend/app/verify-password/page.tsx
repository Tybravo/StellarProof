"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useToast } from "@/context/ToastContext";

interface VerifyPasswordFormValues {
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  if (score === 2)
    return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
  if (score === 3)
    return { label: "Strong", color: "bg-blue-500", width: "w-3/4" };
  return { label: "Very Strong", color: "bg-green-500", width: "w-full" };
}

export default function VerifyPasswordPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VerifyPasswordFormValues>({
    mode: "onBlur",
  });

  const newPasswordValue = watch("newPassword", "");
  const strength = newPasswordValue
    ? getPasswordStrength(newPasswordValue)
    : null;

  const onSubmit = async (data: VerifyPasswordFormValues) => {
    setIsLoading(true);
    try {
      // Mock submission for now
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addToast({
        type: "success",
        message:
          "Password reset successful! You can now log in with your new password.",
      });
      router.push("/login");
    } catch {
      addToast({
        type: "error",
        message: "Failed to reset password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase =
    "w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition";
  const inputNormal = `${inputBase} border-gray-300 dark:border-gray-600 focus:ring-primary`;
  const inputError = `${inputBase} border-red-500 focus:ring-red-500`;

  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4"
    >
      <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">StellarProof</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Verify and reset your password
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5 w-full"
        >
          {/* OTP */}
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              OTP (One-Time Password)
            </label>
            <input
              id="otp"
              type="text"
              placeholder="Enter 6-digit OTP"
              className={errors.otp ? inputError : inputNormal}
              {...register("otp", {
                required: "OTP is required",
                pattern: {
                  value: /^\d{6}$/,
                  message: "Please enter a valid 6-digit OTP",
                },
              })}
            />
            {errors.otp && (
              <p className="text-red-500 text-xs mt-1">{errors.otp.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`${errors.newPassword ? inputError : inputNormal} pr-14`}
                {...register("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                  validate: {
                    hasUppercase: (v) =>
                      /[A-Z]/.test(v) ||
                      "Password must contain at least one uppercase letter",
                    hasNumber: (v) =>
                      /[0-9]/.test(v) ||
                      "Password must contain at least one number",
                    hasSpecial: (v) =>
                      /[^A-Za-z0-9]/.test(v) ||
                      "Password must contain at least one special character",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.newPassword.message}
              </p>
            )}
            {/* Password Strength Indicator */}
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} ${strength.width} rounded-full transition-all duration-300`}
                  />
                </div>
                <p
                  className={`text-xs mt-1 ${
                    strength.label === "Weak"
                      ? "text-red-500"
                      : strength.label === "Fair"
                        ? "text-yellow-500"
                        : strength.label === "Strong"
                          ? "text-blue-500"
                          : "text-green-500"
                  }`}
                >
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmNewPassword"
                type={showConfirmNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className={`${errors.confirmNewPassword ? inputError : inputNormal} pr-14`}
                {...register("confirmNewPassword", {
                  required: "Please confirm your new password",
                  validate: (v) =>
                    v === newPasswordValue || "Passwords do not match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
              >
                {showConfirmNewPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.confirmNewPassword && (
              <p className="text-red-500 text-xs mt-1">
                {errors.confirmNewPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
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
                Resetting password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Remember your password?{" "}
          <a href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
