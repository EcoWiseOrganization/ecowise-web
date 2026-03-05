"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { login, signup, signInWithGoogle } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const error = searchParams.get("error");
  const message = searchParams.get("message");

  useEffect(() => {
    if (searchParams.get("tab") === "signup") {
      setActiveTab("signup");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg shadow-green-200">
            <svg
              className="w-9 h-9 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">EcoWise</h1>
          <p className="text-gray-500 mt-1">
            Track & reduce your carbon footprint
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-green-100/50 border border-green-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                activeTab === "login"
                  ? "text-green-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Sign In
              {activeTab === "login" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
                activeTab === "signup"
                  ? "text-green-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Sign Up
              {activeTab === "signup" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600" />
              )}
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Error / Success Messages */}
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-100">
                {message}
              </div>
            )}

            {/* Google OAuth */}
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-400">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Login Form */}
            {activeTab === "login" && (
              <form action={login} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-green-200 hover:shadow-green-300 transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </form>
            )}

            {/* Signup Form */}
            {activeTab === "signup" && (
              <form action={signup} className="space-y-4">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-green-200 hover:shadow-green-300 transition-all cursor-pointer"
                >
                  Create Account
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              By continuing, you agree to EcoWise&apos;s Terms of Service and
              Privacy Policy.
            </p>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Making the world greener, one step at a time.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
