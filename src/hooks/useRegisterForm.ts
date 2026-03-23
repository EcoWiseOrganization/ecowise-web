"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { sendRegistrationOtp } from "@/services/auth.service";

function validate(name: string, email: string, password: string, confirmPassword: string) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "Name is required";
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email";
  if (!password) errors.password = "Password is required";
  else if (password.length < 6) errors.password = "Password must be at least 6 characters";
  if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
  return errors;
}

export function useRegisterForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string) || "";
    const email = (form.get("email") as string) || "";
    const password = (form.get("password") as string) || "";
    const confirmPassword = (form.get("confirmPassword") as string) || "";

    const errs = validate(name, email, password, confirmPassword);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setGeneralError("");

    try {
      await sendRegistrationOtp(name, email, password);
      sessionStorage.setItem("register_name", name);
      sessionStorage.setItem("register_email", email);
      sessionStorage.setItem("register_password", password);
      router.push("/register/verify");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "GOOGLE_ACCOUNT_ONLY") {
        setGeneralError(t("register.error.googleAccountOnly"));
      } else {
        setGeneralError(msg || t("register.error.unexpected"));
      }
      setLoading(false);
    }
  };

  return {
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    agreed,
    setAgreed,
    loading,
    errors,
    generalError,
    handleSubmit,
  };
}
