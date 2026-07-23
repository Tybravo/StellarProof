"use client";

import Link from "next/link";

export default function VerifyNewPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4 py-10">
      <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">Verify New Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Use the code sent to your email to verify your request and set a new password.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              autoComplete="one-time-code"
              placeholder="123456"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>

          <button
            type="button"
            className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all duration-200 shadow-button-glow"
          >
            Verify Code
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Return to {" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
