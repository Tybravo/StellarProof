"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ReportIssueFormState {
  category: string;
  otherCategory: string;
  description: string;
  wallet: string;
  network: string;
  attachment: File | null;
}

interface ReportIssueFormErrors {
  category?: string;
  otherCategory?: string;
  description?: string;
  attachment?: string;
}

const CATEGORIES = [
  { value: "", label: "Select category" },
  { value: "bug", label: "Bug" },
  { value: "ui", label: "UI Issue" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formState, setFormState] = useState<ReportIssueFormState>({
    category: "",
    otherCategory: "",
    description: "",
    wallet: "",
    network: "",
    attachment: null,
  });
  const [errors, setErrors] = useState<ReportIssueFormErrors>({});
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const isOtherCategorySelected = formState.category === "other";
  const hasWallet = Boolean(formState.wallet);

  // Initialize wallet and network
  useEffect(() => {
    setFormState((prev) => ({
      ...prev,
      wallet: publicKey || "",
      network: detectNetwork(),
    }));
  }, [publicKey]);

  // Generate/revoke attachment preview URL
  useEffect(() => {
    if (!formState.attachment) {
      setAttachmentPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(formState.attachment);
    setAttachmentPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [formState.attachment]);

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategory = event.target.value;
    setFormState((prev) => ({
      ...prev,
      category: nextCategory,
      otherCategory: nextCategory === "other" ? prev.otherCategory : "",
    }));
    setErrors((prev) => ({
      ...prev,
      category: undefined,
      otherCategory: nextCategory === "other" ? prev.otherCategory : undefined,
    }));
  };

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const nextDescription = event.target.value;
    setFormState((prev) => ({ ...prev, description: nextDescription }));
    setErrors((prev) => ({ ...prev, description: undefined }));
  };

  const handleOtherCategoryChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextOtherCategory = event.target.value;
    setFormState((prev) => ({ ...prev, otherCategory: nextOtherCategory }));
    setErrors((prev) => ({ ...prev, otherCategory: undefined }));
  };

  const processAttachment = (file: File | null | undefined) => {
    if (!file) return;

    if (!ACCEPTED_IMAGE_MIME_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        attachment: "Only PNG, JPG, JPEG, GIF, or WEBP files are allowed",
      }));
      return;
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setErrors((prev) => ({
        ...prev,
        attachment: "File size must not exceed 5MB",
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, attachment: file }));
    setErrors((prev) => ({ ...prev, attachment: undefined }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    processAttachment(event.target.files?.[0]);
    // Allow users to re-select the same file.
    event.target.value = "";
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    processAttachment(event.dataTransfer.files?.[0]);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = () => {
    setFormState((prev) => ({ ...prev, attachment: null }));
    setErrors((prev) => ({ ...prev, attachment: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: ReportIssueFormErrors = {};

    if (!formState.category) {
      nextErrors.category = "Category is required";
    }

    if (formState.category === "other" && !formState.otherCategory.trim()) {
      nextErrors.otherCategory = "Other category is required";
    }

    if (!formState.description.trim()) {
      nextErrors.description = "Description is required";
    } else if (formState.description.trim().length < 10) {
      nextErrors.description = "Description must be at least 10 characters";
    }

    if (formState.attachment) {
      if (!ACCEPTED_IMAGE_MIME_TYPES.includes(formState.attachment.type)) {
        nextErrors.attachment = "Only PNG, JPG, JPEG, GIF, or WEBP files are allowed";
      } else if (formState.attachment.size > MAX_ATTACHMENT_SIZE) {
        nextErrors.attachment = "File size must not exceed 5MB";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock success response
      addToast(
        "Issue reported successfully. Thank you for your feedback!",
        "success",
      );

      setFormState({
        category: "",
        otherCategory: "",
        description: "",
        wallet: publicKey || "",
        network: detectNetwork(),
        attachment: null,
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _error = error;
      addToast("Failed to submit issue. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
      setIsDragActive(false);
    }
  };

  const labelClass = `block text-sm font-semibold mb-2 ${
    isDark ? "text-white" : "text-gray-900"
  }`;
  const inputBase = `w-full px-4 py-2 rounded-md border transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent`;
  const inputNormal = isDark
    ? "border-gray-600 bg-gray-700 text-white placeholder-gray-400"
    : "border-gray-300 bg-white text-gray-900 placeholder-gray-500";
  const inputReadOnly = isDark
    ? "border-gray-600 bg-gray-700 text-gray-300 cursor-not-allowed"
    : "border-gray-300 bg-gray-100 text-gray-600 cursor-not-allowed";
  const inputError = "border-red-500";
  const descriptionLength = formState.description.length;

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
            onSubmit={onSubmit}
            noValidate
            className="space-y-6"
          >
            {/* Category */}
            <div>
              <label htmlFor="category" className={labelClass}>
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formState.category}
                onChange={handleCategoryChange}
                className={`${inputBase} ${errors.category ? inputError : inputNormal}`}
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
                  {errors.category}
                </p>
              )}
            </div>

            {/* Other Category (Conditional) */}
            {isOtherCategorySelected && (
              <div>
                <label htmlFor="otherCategory" className={labelClass}>
                  Other Category <span className="text-red-500">*</span>
                </label>
                <input
                  id="otherCategory"
                  type="text"
                  value={formState.otherCategory}
                  onChange={handleOtherCategoryChange}
                  placeholder="Please specify the category"
                  className={`${inputBase} ${
                    errors.otherCategory ? inputError : inputNormal
                  }`}
                />
                {errors.otherCategory && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.otherCategory}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label htmlFor="description" className={labelClass}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={formState.description}
                onChange={handleDescriptionChange}
                rows={5}
                placeholder="Please describe the issue in detail..."
                className={`${inputBase} resize-none ${
                  errors.description ? inputError : inputNormal
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.description ? (
                  <p className="text-red-500 text-sm">{errors.description}</p>
                ) : (
                  <span />
                )}
                <span
                  className={`text-xs ${
                    isDark ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {descriptionLength}
                </span>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div>
              <label htmlFor="attachment" className={labelClass}>
                Screenshot{" "}
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  (optional)
                </span>
              </label>
              <div
                onClick={openFilePicker}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-md p-6 text-center transition-colors cursor-pointer ${
                  errors.attachment
                    ? "border-red-500"
                    : isDragActive
                      ? "border-blue-500 bg-blue-500/10"
                      : isDark
                        ? "border-gray-600 hover:border-blue-400"
                        : "border-gray-300 hover:border-blue-500"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="attachment"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
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
                  PNG, JPG, JPEG, GIF, or WEBP (max 5MB)
                </p>
              </div>
              {errors.attachment && (
                <p className="text-red-500 text-sm mt-1">{errors.attachment}</p>
              )}
              {attachmentPreview && (
                <div className="mt-4">
                  <div className="relative inline-block">
                    <Image
                      src={attachmentPreview}
                      alt="Preview"
                      width={192}
                      height={192}
                      className="max-h-48 rounded-md object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeAttachment}
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
                value={formState.wallet}
                readOnly
                className={`${inputBase} ${inputReadOnly}`}
              />
              <p
                className={`text-xs mt-1 ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {hasWallet
                  ? `Connected wallet: ${formState.wallet.slice(0, 6)}...${formState.wallet.slice(-6)}`
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
                value={formState.network}
                readOnly
                className={`${inputBase} ${inputReadOnly}`}
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
