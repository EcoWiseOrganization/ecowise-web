"use client";

import { useTranslation } from "react-i18next";

/** Renders a translation key as text — use in Server Component templates where t() is unavailable */
export function T({ k, fallback }: { k: string; fallback?: string }) {
  const { t } = useTranslation();
  return <>{t(k, { defaultValue: fallback ?? k })}</>;
}
