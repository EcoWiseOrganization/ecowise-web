"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/services/auth.service";

function validatePasswords(password: string, confirmPassword: string): string | null {
  if (!password || !confirmPassword) return "Please fill in all fields";
  if (password.length < 6) return "Password must be at least 6 characters";
  if (password !== confirmPassword) return "Passwords do not match";
  return null;
}

export function useResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("forgot_password_email");
    const storedToken = sessionStorage.getItem("reset_token");
    if (!storedEmail || !storedToken) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(storedEmail);
    setResetToken(storedToken);
  }, [router]);

  const handleReset = async () => {
    const validationError = validatePasswords(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPassword(email, password, resetToken);
      sessionStorage.removeItem("forgot_password_email");
      sessionStorage.removeItem("reset_token");
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
