"use client";

import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";

interface ForgetPasswordFormValues {
  email: string;
}

export default function ForgetPasswordPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgetPasswordFormValues>({
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const onSubmit: SubmitHandler<ForgetPasswordFormValues> = () => {
    router.push("/verify-new-password");
  };

  const inputBase =
    "w-full px-4 py-2.5 rounded-lg border text-sm bg-white dark:bg-darkblue-dark text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition";
  const inputNormal = `${inputBase} border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary`;
  const inputError = `${inputBase} border-red-500 focus:ring-2 focus:ring-red-500`;

  return (
    <main className="min-h-screen flex items-center justify-center bg-darkblue dark:bg-darkblue-dark px-4 py-10">
      <div className="w-full max-w-md bg-white dark:bg-darkblue rounded-2xl shadow-glow p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">Forgot Password</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your email address and we&apos;ll send you a one-time verification code.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
              className={errors.email ? inputError : inputNormal}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Please enter a valid email address",
                },
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-all duration-200 flex items-center justify-center disabled:opacity-60 shadow-button-glow"
          >
            {isSubmitting ? "Sending code..." : "Send OTP"}
          </button>
        </form>
      </div>
    </main>
  );
}
