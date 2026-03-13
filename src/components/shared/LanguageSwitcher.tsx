"use client";

import LanguageIcon from "@mui/icons-material/Language";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ onClose }: { onClose?: () => void }) {
  const { i18n: i18nInstance } = useTranslation();
  const [open, setOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const currentLang = i18nInstance.language === "vi" ? "VI" : "EN";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (lang: string) => {
    i18nInstance.changeLanguage(lang);
    localStorage.setItem("ecowise_language", lang);
    setOpen(false);
    onClose?.();
  };

  return (
    <div className="relative" ref={langRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[#79B669] hover:text-[#1F8505] transition-colors bg-transparent border-none cursor-pointer p-0"
        aria-label="Select language"
      >
        <LanguageIcon sx={{ fontSize: 22 }} />
        <span className="text-sm font-medium">{currentLang}</span>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-[#DAEDD5] py-1 z-[60]">
          <button
            onClick={() => handleChange("en")}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 bg-transparent border-none cursor-pointer transition-colors ${
              i18nInstance.language === "en"
                ? "text-[#1F8505] bg-[#f0f9ed] font-semibold"
                : "text-[#3B3D3B] hover:bg-[#f0f9ed] hover:text-[#1F8505]"
            }`}
          >
            <span className="text-base">🇺🇸</span>
            <span>English</span>
            {i18nInstance.language === "en" && <span className="ml-auto text-[#1F8505]">✓</span>}
          </button>
          <button
            onClick={() => handleChange("vi")}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 bg-transparent border-none cursor-pointer transition-colors ${
              i18nInstance.language === "vi"
                ? "text-[#1F8505] bg-[#f0f9ed] font-semibold"
                : "text-[#3B3D3B] hover:bg-[#f0f9ed] hover:text-[#1F8505]"
            }`}
          >
            <span className="text-base">🇻🇳</span>
            <span>Tiếng Việt</span>
            {i18nInstance.language === "vi" && <span className="ml-auto text-[#1F8505]">✓</span>}
          </button>
        </div>
      )}
    </div>
  );
}
