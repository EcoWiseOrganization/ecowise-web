"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { sendRegistrationOtp } from "@/services/auth.service";

/** Returns translation KEYS instead of literal strings so the rendering
 * component (or this hook itself, via `t`) resolves them once at render
 * time. Keeps validation testable without React context. */
function validateKeys(name: string, email: string) {
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = "auth.field.nameRequired";
  if (!email.trim()) errors.email = "auth.field.emailRequired";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "auth.field.emailInvalid";
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

    // Convert keys → localised text once before they leave the hook so
    // the page can keep rendering `errors.foo` directly.
    const keyErrs = validateKeys(name, email);
    const errs: Record<string, string> = {};
    for (const [field, key] of Object.entries(keyErrs)) errs[field] = t(key);
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
        // `msg` comes straight from the server response — only surface
        // it when it isn't a raw MSG / error code (lowercase indicator).
        // Otherwise fall back to the generic localised copy.
        const looksFriendly = msg && /[ a-z]{4,}/i.test(msg);
        setGeneralError(
          looksFriendly ? msg : t("auth.error.unexpected"),
        );
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
