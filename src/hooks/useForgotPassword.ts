"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendForgotPasswordOtp } from "@/services/auth.service";

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
      sessionStorage.setItem("forgot_password_email", email);
      setSent(true);
      router.push("/forgot-password/verify");
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
