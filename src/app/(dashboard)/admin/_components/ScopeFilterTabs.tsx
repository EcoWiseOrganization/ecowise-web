"use client";

import { useTranslation } from "react-i18next";

const SCOPE_ACTIVE_CLS: Record<string, string> = {
  all:       "bg-[#1F8505] text-white border-[#1F8505]",
  "Scope 1": "bg-red-600   text-white border-red-600",
  "Scope 2": "bg-amber-500 text-white border-amber-500",
  "Scope 3": "bg-blue-600  text-white border-blue-600",
};

const SCOPE_BADGE_ACTIVE: Record<string, string> = {
  all:       "bg-white/25 text-white",
  "Scope 1": "bg-white/25 text-white",
  "Scope 2": "bg-white/25 text-white",
  "Scope 3": "bg-white/25 text-white",
};

const SCOPE_BADGE_INACTIVE: Record<string, string> = {
  all:       "bg-[#DAEDD5] text-[#1F8505]",
  "Scope 1": "bg-red-100   text-red-700",
  "Scope 2": "bg-amber-100 text-amber-700",
  "Scope 3": "bg-blue-100  text-blue-700",
};

interface ScopeFilterTabsProps {
  /** Currently selected scope key: "all" | "Scope 1" | "Scope 2" | "Scope 3" */
  value: string;
  onChange: (scope: string) => void;
  /** Count for each scope key */
  counts: Record<string, number>;
}

export function ScopeFilterTabs({ value, onChange, counts }: ScopeFilterTabsProps) {
  const { t } = useTranslation();

  const tabs = [
    { key: "all",     label: t("admin.ef.allScopes") },
    { key: "Scope 1", label: "Scope 1" },
    { key: "Scope 2", label: "Scope 2" },
    { key: "Scope 3", label: "Scope 3" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map(({ key, label }) => {
        const active = value === key;
        const count  = counts[key] ?? 0;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
              active
                ? SCOPE_ACTIVE_CLS[key]
                : "bg-white text-[#3B3D3B] border-[#DAEDD5] hover:border-[#79B669]"
            }`}
          >
            {label}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                active ? SCOPE_BADGE_ACTIVE[key] : SCOPE_BADGE_INACTIVE[key]
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
