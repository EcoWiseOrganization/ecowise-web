"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await sendForgotPasswordOtp(email);
      setSent(true);
      router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setError("");
    setResending(true);

    try {
      await sendForgotPasswordOtp(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return { email, setEmail, error, loading, sent, resending, handleSend, handleResend };
}
