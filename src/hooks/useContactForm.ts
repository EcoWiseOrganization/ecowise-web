"use client";

import { useCallback, useState } from "react";
import { isEmail } from "@/lib/validators";
import { MSG } from "@/lib/messages";

export interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: real users never fill this */
  website: string;
}

const EMPTY: ContactFormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

export function useContactForm() {
  const [form, setForm] = useState<ContactFormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);

  const update = useCallback(<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setRetryAfter(null);
    setSuccess(false);

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError(MSG.REQUIRED_FIELD);
      return false;
    }
    if (!isEmail(form.email)) {
      setError(MSG.INVALID_FORMAT);
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json?.error as string) ?? "INTERNAL_ERROR");
        if (json?.retryAfterSec) setRetryAfter(Number(json.retryAfterSec));
        return false;
      }
      setSuccess(true);
      setForm(EMPTY);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "INTERNAL_ERROR");
      return false;
    } finally {
      setLoading(false);
    }
  }, [form]);

  return { form, update, loading, error, retryAfter, success, submit };
}
