"use client";

import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTheme } from "@/app/context/ThemeContext";
import { useWallet } from "@/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";
import { contactService } from "@/services/contact";
import { ArrowLeft, Mail, Clock, HelpCircle, Paperclip, X } from "lucide-react";
import Link from "next/link";

const SUBJECT_OPTIONS = [
  { value: "", label: "Select a subject" },
  { value: "general", label: "General Inquiry" },
  { value: "technical", label: "Technical Support" },
  { value: "billing", label: "Billing & Payments" },
  { value: "partnership", label: "Partnership Opportunities" },
  { value: "feedback", label: "Feedback & Suggestions" },
  { value: "other", label: "Other" },
];

const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/pdf",
  "text/plain",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const contactSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must not exceed 100 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  subject: z
    .string()
    .min(1, "Please select a subject"),
  message: z
    .string()
    .min(20, "Message must be at least 20 characters")
    .max(1000, "Message must not exceed 1000 characters"),
});

type ContactFormInputs = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { theme } = useTheme();
  const { publicKey } = useWallet();
  const { addToast } = useToast();

  const isDark = theme === "dark";
  const isAuthenticated = Boolean(publicKey);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormInputs>({
    resolver: zodResolver(contactSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const messageValue = watch("message") || "";
  const messageLength = messageValue.length;

  // Auto-fill name and email for authenticated users
  useEffect(() => {
    if (publicKey) {
      const truncatedKey = `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`;
      setValue("fullName", truncatedKey);
      setValue("email", `${publicKey.slice(0, 8)}@stellar.wallet`);
    }
  }, [publicKey, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setAttachment(null);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setAttachmentError(
        "Only PNG, JPG, GIF, PDF, and TXT files are allowed"
      );
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setAttachmentError("File size must not exceed 5MB");
      e.target.value = "";
      return;
    }
    setAttachment(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentError(null);
    const input = document.getElementById("attachment") as HTMLInputElement;
    if (input) input.value = "";
  };

  const onSubmit: SubmitHandler<ContactFormInputs> = async (data) => {
    try {
      const result = await contactService.submitInquiry({
        ...data,
        attachment,
      });

      if (result.success) {
        addToast(result.message, "success");
        reset({
          fullName: isAuthenticated
            ? `${publicKey!.slice(0, 6)}...${publicKey!.slice(-6)}`
            : "",
          email: isAuthenticated
            ? `${publicKey!.slice(0, 8)}@stellar.wallet`
            : "",
          subject: "",
          message: "",
        });
        removeAttachment();
      } else {
        addToast(result.message, "error");
      }
    } catch {
      addToast(
        "Something went wrong. Please check your connection and try again.",
        "error"
      );
    }
  };

  // Shared style helpers
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

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? "bg-[#020617]" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
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
                Contact Us
              </h1>
              <p
                className={`mb-8 ${isDark ? "text-gray-400" : "text-gray-600"}`}
              >
                Have a question or need help? Send us a message and we will get
                back to you.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-6"
              >
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className={labelClass}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    {...register("fullName")}
                    readOnly={isAuthenticated}
                    placeholder="Enter your full name"
                    className={`${inputBase} ${
                      errors.fullName
                        ? inputError
                        : isAuthenticated
                          ? inputReadOnly
                          : inputNormal
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    readOnly={isAuthenticated}
                    placeholder="you@example.com"
                    className={`${inputBase} ${
                      errors.email
                        ? inputError
                        : isAuthenticated
                          ? inputReadOnly
                          : inputNormal
                    }`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className={labelClass}>
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="subject"
                    {...register("subject")}
                    className={`${inputBase} ${
                      errors.subject ? inputError : inputNormal
                    }`}
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.value === ""}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.subject.message}
                    </p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className={labelClass}>
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    {...register("message")}
                    rows={6}
                    placeholder="Tell us how we can help (minimum 20 characters)..."
                    className={`${inputBase} resize-none ${
                      errors.message ? inputError : inputNormal
                    }`}
                  />
                  <div className="flex justify-between mt-1">
                    {errors.message ? (
                      <p className="text-red-500 text-sm">
                        {errors.message.message}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`text-xs ${
                        messageLength > 1000
                          ? "text-red-500"
                          : isDark
                            ? "text-gray-400"
                            : "text-gray-500"
                      }`}
                    >
                      {messageLength}/1000
                    </span>
                  </div>
                </div>

                {/* Attachment */}
                <div>
                  <label htmlFor="attachment" className={labelClass}>
                    Attachment{" "}
                    <span
                      className={isDark ? "text-gray-400" : "text-gray-500"}
                    >
                      (optional, max 5MB)
                    </span>
                  </label>
                  {attachment ? (
                    <div
                      className={`flex items-center justify-between rounded-md border px-4 py-3 ${
                        isDark
                          ? "border-gray-600 bg-gray-700"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip
                          size={16}
                          className={
                            isDark ? "text-gray-400" : "text-gray-500"
                          }
                        />
                        <span
                          className={`text-sm truncate ${
                            isDark ? "text-gray-200" : "text-gray-700"
                          }`}
                        >
                          {attachment.name}
                        </span>
                        <span
                          className={`text-xs flex-shrink-0 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeAttachment}
                        className="ml-2 text-red-500 hover:text-red-400 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`border-2 border-dashed rounded-md p-6 text-center transition-colors ${
                        attachmentError
                          ? "border-red-500"
                          : isDark
                            ? "border-gray-600"
                            : "border-gray-300"
                      }`}
                    >
                      <input
                        id="attachment"
                        type="file"
                        accept=".png,.jpg,.jpeg,.gif,.pdf,.txt"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="attachment" className="cursor-pointer">
                        <Paperclip
                          size={24}
                          className={`mx-auto mb-2 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        />
                        <div
                          className={`text-sm ${
                            isDark ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          <span className="font-semibold text-blue-500">
                            Click to upload
                          </span>{" "}
                          a file
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          PNG, JPG, GIF, PDF, or TXT (max 5MB)
                        </p>
                      </label>
                    </div>
                  )}
                  {attachmentError && (
                    <p className="text-red-500 text-sm mt-1">
                      {attachmentError}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                      isSubmitting
                        ? "opacity-50 cursor-not-allowed bg-blue-500"
                        : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div
              className={`rounded-lg shadow-lg p-6 sticky top-8 ${
                isDark ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h2
                className={`text-lg font-bold mb-6 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Get in Touch
              </h2>

              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark ? "bg-blue-500/20" : "bg-blue-50"
                    }`}
                  >
                    <Mail
                      size={20}
                      className={
                        isDark ? "text-blue-400" : "text-blue-600"
                      }
                    />
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Email Us
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      support@stellarproof.io
                    </p>
                  </div>
                </div>

                {/* Response Time */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark ? "bg-blue-500/20" : "bg-blue-50"
                    }`}
                  >
                    <Clock
                      size={20}
                      className={
                        isDark ? "text-blue-400" : "text-blue-600"
                      }
                    />
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      Response Time
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      We typically respond within 24-48 hours
                    </p>
                  </div>
                </div>

                {/* FAQ */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark ? "bg-blue-500/20" : "bg-blue-50"
                    }`}
                  >
                    <HelpCircle
                      size={20}
                      className={
                        isDark ? "text-blue-400" : "text-blue-600"
                      }
                    />
                  </div>
                  <div>
                    <h3
                      className={`text-sm font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      FAQ
                    </h3>
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Check our{" "}
                      <Link
                        href="#"
                        className="text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        frequently asked questions
                      </Link>{" "}
                      for quick answers
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div
                className={`border-t mt-6 pt-6 ${
                  isDark ? "border-gray-700" : "border-gray-200"
                }`}
              >
                <p
                  className={`text-xs ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  For urgent issues, please use our{" "}
                  <Link
                    href="/report-issue"
                    className="text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    Report an Issue
                  </Link>{" "}
                  page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
