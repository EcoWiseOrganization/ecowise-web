"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyForgotPasswordOtp } from "@/services/auth.service";

export function useForgotPasswordVerify() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("forgot_password_email");
    if (!storedEmail) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(storedEmail);
  }, [router]);

  const handleConfirm = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 4) {
      setError("Please enter the 4-digit verification code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await verifyForgotPasswordOtp(email, otpCode);
      sessionStorage.setItem("reset_token", data.resetToken!);
      router.push("/forgot-password/reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { otp, setOtp, email, error, loading, handleConfirm };
}
