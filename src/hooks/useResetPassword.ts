"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/services/auth.service";

function validatePasswords(password: string, confirmPassword: string): string | null {
  if (!password || !confirmPassword) return "Please fill in all fields";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
}

/**
 * Forgot-password step 3 — set a new password.
 *
 * Email comes from the URL (`?email=`). The reset token is in the
 * HTTP-only cookie that the verify step set — the client never handles
 * it. If the cookie is missing or stale, the server returns
 * `Invalid or expired reset session` and we bounce the user back to
 * step 1.
 */
export function useResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams?.get("email") ?? "";
    if (!fromQuery) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(fromQuery);
  }, [router, searchParams]);

  const handleReset = async () => {
    const validationError = validatePasswords(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPassword(email, password);
      router.push("/forgot-password/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, setShowPassword,
    showConfirm, setShowConfirm,
    email, error, loading,
    handleReset,
  };
}
