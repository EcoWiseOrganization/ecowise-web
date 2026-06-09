"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { sendRegistrationOtp } from "@/services/auth.service";

function validate(name: string, email: string) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "Name is required";
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "Please enter a valid email";
  return errors;
}

/**
 * Register step 1.
 *
 * Captures name + email only. The plaintext password is asked for at the
 * OTP-verify step instead; it doesn't transit through sessionStorage
 * between two endpoints anymore.
 *
 * We pass `email` through the next-step URL (`?email=`) so the verify
 * page can pre-fill it; the email is also already persisted server-side
 * on the OTP row.
 */
export function useRegisterForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = ((form.get("name") as string) || "").trim();
    const email = ((form.get("email") as string) || "").trim();

    const errs = validate(name, email);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setGeneralError("");

    try {
      await sendRegistrationOtp(name, email);
      router.push(`/register/verify?email=${encodeURIComponent(email)}`);
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
    agreed,
    setAgreed,
    loading,
    errors,
    generalError,
    handleSubmit,
  };
}
