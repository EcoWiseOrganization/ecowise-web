"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./config";

/**
 * Sync `<html lang>` with the active i18n locale. Screen readers + the
 * browser's text-to-speech / hyphenation / spell-check pipeline all
 * key off this attribute; hardcoding `lang="en"` in the SSR layout
 * silently broke VN users even after they switched language.
 *
 * We mutate the existing element rather than re-rendering the layout
 * (it's a server component and we can't reach it from a hook).
 */
function LanguageInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem("ecowise_language");
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
    const sync = (lng: string) => {
      if (typeof document !== "undefined") {
        document.documentElement.lang = lng === "vi" ? "vi" : "en";
      }
    };
    sync(i18n.language);
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, []);

  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageInitializer />
      {children}
    </I18nextProvider>
  );
}
