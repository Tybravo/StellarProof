"use client";

import React from "react";
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">StellarProof</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create your account
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-primary font-medium hover:underline"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
