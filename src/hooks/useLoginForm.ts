"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { login } from "@/services/auth.actions";

function validate(
  email: string,
  password: string,
  t: (key: string) => string
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!email.trim()) {
    errors.email = t("login.error.emailRequired");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = t("login.error.emailInvalid");
  }
  if (!password) {
    errors.password = t("login.error.passwordRequired");
  }
  return errors;
}

export function useLoginForm() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string) || "";
    const password = (formData.get("password") as string) || "";

    const errs = validate(email, password, t);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setGeneralError("");

    try {
      const result = await login(formData);
      if (result?.errorKey) {
        setGeneralError(t(result.errorKey));
        setLoading(false);
      }
      // On success, redirect() in server action handles navigation automatically
    } catch {
      setGeneralError(t("login.error.unexpected"));
      setLoading(false);
    }
  };

  return {
    loading,
    errors,
    generalError,
    showPassword,
    setShowPassword,
    handleSubmit,
  };
}
