"use client";

import { useTranslation } from "react-i18next";

/**
 * Renders a translation key as text. Use inside server components
 * where t() isn't directly available — `<T k="..." />` mounts a
 * tiny client component that subscribes to the active language.
 *
 * Supports interpolated params: `<T k="x.y" params={{ name: "foo" }} />`
 * mirrors `t("x.y", { name: "foo" })`.
 */
export function T({
  k,
  fallback,
  params,
}: {
  k: string;
  fallback?: string;
  params?: Record<string, string | number>;
}) {
  const { t } = useTranslation();
  return <>{t(k, { defaultValue: fallback ?? k, ...(params ?? {}) })}</>;
}
