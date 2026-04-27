"use client";

import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

export default function LaunchPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4 py-12">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Register Section */}
        <div className="bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8 flex flex-col items-center">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-primary">Create Account</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Join StellarProof today
            </p>
          </div>
          <RegisterForm />
        </div>

        {/* Divider for mobile (optional), but we use gap */}
        
        {/* Login Section */}
        <div className="bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8 flex flex-col items-center">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-primary">Sign In</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Welcome back to StellarProof
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
