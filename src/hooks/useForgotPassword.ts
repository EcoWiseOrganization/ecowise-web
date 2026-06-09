"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { sendForgotPasswordOtp } from "@/services/auth.service";

/**
 * Forgot-password step 1 — request an OTP for the supplied email.
 *
 * Email is passed to the verify step through the URL (`?email=`) instead
 * of sessionStorage. Server endpoints always return success regardless of
 * whether the email is registered (see send-otp route comment) so the
 * navigation behaviour stays identical.
 */
export function useForgotPassword() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      setError(t("auth.field.emailRequiredSimple"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendForgotPasswordOtp(email);
      setSent(true);
      router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError(t("auth.field.emailRequiredSimple"));
      return;
    }

    setError("");
    setResending(true);

    try {
      await sendForgotPasswordOtp(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.unexpected"));
    } finally {
      setResending(false);
    }
  };

  return { email, setEmail, error, loading, sent, resending, handleSend, handleResend };
}
