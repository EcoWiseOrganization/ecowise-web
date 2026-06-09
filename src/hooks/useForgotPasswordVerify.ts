"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { verifyForgotPasswordOtp } from "@/services/auth.service";

/**
 * Forgot-password step 2 — verify the OTP.
 *
 * Email comes from the URL (`?email=`) instead of sessionStorage. On
 * success the server sets an HTTP-only `ecowise.reset_token` cookie that
 * the `/reset` endpoint will read; the client never sees or stores the
 * token, removing the XSS vector that the previous `sessionStorage` round
 * trip exposed.
 */
export function useForgotPasswordVerify() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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

  const handleConfirm = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError(t("auth.field.otp6RequiredVerify"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      await verifyForgotPasswordOtp(email, otpCode);
      router.push(`/forgot-password/reset?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  return { otp, setOtp, email, error, loading, handleConfirm };
}
