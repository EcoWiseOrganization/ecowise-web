"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyRegistrationOtp } from "@/services/auth.service";

/**
 * Register step 2.
 *
 * The user supplies the 6-digit OTP plus their chosen password. Email is
 * read from the URL query (`?email=`) — it's also already stored on the
 * server-side OTP row, so any tampering with the param will simply miss
 * the row and surface as "Invalid verification code".
 *
 * sessionStorage is no longer used to round-trip the password between
 * steps; we never saw the password in the previous step.
 */
export function useVerifyOtp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const fromQuery = searchParams?.get("email") ?? "";
    if (!fromQuery) {
      router.replace("/register");
      return;
    }
    setEmail(fromQuery);
  }, [router, searchParams]);

  const handleConfirm = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await verifyRegistrationOtp(email, code, password);
      router.push("/register/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setLoading(false);
    }
  };

  return {
    otp,
    setOtp,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    error,
    loading,
    email,
    handleConfirm,
  };
}
