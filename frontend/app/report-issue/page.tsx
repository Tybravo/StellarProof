"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useTheme } from "@/app/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface FormInputs {
  category: string;
  description: string;
  screenshot?: FileList;
  wallet: string;
  network: string;
}

const CATEGORIES = [
  { value: "", label: "Select category" },
  { value: "bug", label: "Bug" },
  { value: "ui", label: "UI Issue" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

function detectNetwork(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname;
  if (hostname.includes("test") || hostname.includes("testnet")) {
    return "Testnet";
  }
  return "Public";
}

export default function ReportIssuePage() {
  const { theme } = useTheme();
  const { publicKey } = useWallet();
  const { addToast } = useToast();

  const isDark = theme === "dark";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormInputs>({
    mode: "onBlur",
    defaultValues: {
      category: "",
      description: "",
      wallet: "",
      network: "",
    },
  });

  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null,
  );
  
  // React Hook Form's watch function is not stable and can trigger re-renders or memoization issues.
  // We're capturing the specific field value here.
  const screenshotFiles = watch("screenshot");

  // Initialize wallet and network
  useEffect(() => {
    setValue("wallet", publicKey || "");
    setValue("network", detectNetwork());
  }, [publicKey, setValue]);

  // Handle screenshot preview
  useEffect(() => {
    if (screenshotFiles && screenshotFiles.length > 0) {
      const file = screenshotFiles[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setScreenshotPreview(null);
    }
    // We intentionally depend on screenshotFiles here.
     
  }, [screenshotFiles]);

  // Remove screenshot
  const removeScreenshot = () => {
    setScreenshotPreview(null);
  };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _data = data;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success response
      addToast(
        "Issue reported successfully. Thank you for your feedback!",
        "success",
      );

      // Reset form
      reset({
        category: "",
        description: "",
        wallet: publicKey || "",
        network: detectNetwork(),
      });
      setScreenshotPreview(null);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _error = error;
      addToast("Failed to submit issue. Please try again.", "error");
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#020617]" : "bg-gray-50"
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/"
          className={`inline-flex items-center gap-2 mb-6 ${
            isDark
              ? "text-blue-400 hover:text-blue-300"
              : "text-blue-600 hover:text-blue-700"
          } transition-colors`}
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        {/* Form Container */}
        <div
          className={`rounded-lg shadow-lg p-8 ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h1
            className={`text-3xl font-bold mb-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            Report an Issue
          </h1>
          <p className={`mb-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Help us improve StellarProof by reporting issues you encounter
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-6"
          >
            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className={`block text-sm font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                {...register("category", { required: "Category is required" })}
                className={`w-full px-4 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category
                    ? "border-red-500"
                    : isDark
                      ? "border-gray-600 bg-gray-700 text-white"
                      : "border-gray-300 bg-white text-gray-900"
                }`}
              >
                {CATEGORIES.map((cat) => (
                  <option
                    key={cat.value}
                    value={cat.value}
                    disabled={cat.value === ""}
                  >
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className={`block text-sm font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                {...register("description", {
                  required: "Description is required",
                  minLength: {
                    value: 10,
                    message: "Description must be at least 10 characters",
                  },
                })}
                rows={5}
                placeholder="Please describe the issue in detail..."
                className={`w-full px-4 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  errors.description
                    ? "border-red-500"
                    : isDark
                      ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
                      : "border-gray-300 bg-white text-gray-900 placeholder-gray-500"
                }`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Screenshot Upload */}
            <div>
              <label
                htmlFor="screenshot"
                className={`block text-sm font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Screenshot{" "}
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  (optional)
                </span>
              </label>
              <div
                className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                  errors.screenshot
                    ? "border-red-500"
                    : isDark
                      ? "border-gray-600"
                      : "border-gray-300"
                }`}
              >
                <input
                  id="screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  {...register("screenshot", {
                    validate: {
                      fileType: (files) => {
                        if (files && files.length > 0) {
                          const validTypes = [
                            "image/png",
                            "image/jpeg",
                            "image/gif",
                          ];
                          return (
                            validTypes.includes(files[0].type) ||
                            "Only PNG, JPG, and GIF files are allowed"
                          );
                        }
                        return true;
                      },
                      fileSize: (files) => {
                        if (files && files.length > 0) {
                          const maxSize = 5 * 1024 * 1024;
                          return (
                            files[0].size <= maxSize ||
                            "File size must not exceed 5MB"
                          );
                        }
                        return true;
                      },
                    },
                  })}
                  className="hidden"
                />
                <label htmlFor="screenshot" className="cursor-pointer">
                  <div
                    className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}
                  >
                    <span className="font-semibold text-blue-500">
                      Click to upload
                    </span>{" "}
                    or drag and drop
                  </div>
                  <p
                    className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    PNG, JPG or GIF (max 5MB)
                  </p>
                </label>
              </div>
              {errors.screenshot && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.screenshot.message as string}
                </p>
              )}
              {screenshotPreview && (
                <div className="mt-4">
                  <div className="relative inline-block">
                    <Image
                      src={screenshotPreview}
                      alt="Preview"
                      width={192}
                      height={192}
                      className="max-h-48 rounded-md object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wallet (Read-only) */}
            <div>
              <label
                htmlFor="wallet"
                className={`block text-sm font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Wallet
              </label>
              <input
                id="wallet"
                type="text"
                {...register("wallet")}
                readOnly
                className={`w-full px-4 py-2 rounded-md border ${
                  isDark
                    ? "border-gray-600 bg-gray-700 text-gray-300"
                    : "border-gray-300 bg-gray-100 text-gray-600"
                } cursor-not-allowed`}
              />
              <p
                className={`text-xs mt-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {watch("wallet")
                  ? `Connected wallet: ${watch("wallet").slice(0, 6)}...${watch("wallet").slice(-6)}`
                  : "No wallet connected"}
              </p>
            </div>

            {/* Network (Read-only) */}
            <div>
              <label
                htmlFor="network"
                className={`block text-sm font-semibold mb-2 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Network
              </label>
              <input
                id="network"
                type="text"
                {...register("network")}
                readOnly
                className={`w-full px-4 py-2 rounded-md border ${
                  isDark
                    ? "border-gray-600 bg-gray-700 text-gray-300"
                    : "border-gray-300 bg-gray-100 text-gray-600"
                } cursor-not-allowed`}
              />
              <p
                className={`text-xs mt-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Auto-detected network
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Issue"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
