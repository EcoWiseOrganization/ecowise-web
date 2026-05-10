"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

const TABS = [
  { href: "/dashboard/settings/profile", labelKey: "settings.tabs.profile" },
  { href: "/dashboard/settings/password", labelKey: "settings.tabs.password" },
  { href: "/dashboard/settings/danger", labelKey: "settings.tabs.danger" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const { t } = useTranslation();
  return (
    <nav className="flex gap-1 border-b border-[#E5E7EB] mb-6" aria-label="Settings tabs">
      {TABS.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              active
                ? "text-[#155A03] border-b-2 border-[#155A03] -mb-px"
                : "text-[#6E726E] hover:text-[#155A03]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
