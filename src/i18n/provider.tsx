"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./config";

function LanguageInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem("ecowise_language");
    if (saved && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
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
