"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { resetPassword } from "@/services/auth.service";

function validatePasswordsKey(
  password: string,
  confirmPassword: string,
): string | null {
  if (!password || !confirmPassword) return "auth.field.fillAllFields";
  if (password.length < 6) return "auth.field.passwordMin6";
  if (password !== confirmPassword) return "auth.field.passwordsMismatch";
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
  const { t } = useTranslation();
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
    const validationKey = validatePasswordsKey(password, confirmPassword);
    if (validationKey) {
      setError(t(validationKey));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPassword(email, password);
      router.push("/forgot-password/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.unexpected"));
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
