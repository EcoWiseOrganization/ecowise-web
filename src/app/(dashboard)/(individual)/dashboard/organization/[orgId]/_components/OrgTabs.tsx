"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";

interface OrgTabsProps {
  orgId: string;
  isAdmin: boolean;
  pendingReviews?: number;
}

export function OrgTabs({ orgId, isAdmin, pendingReviews = 0 }: OrgTabsProps) {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();
  const base = `/dashboard/organization/${orgId}`;

  const tabs: Array<{ href: string; labelKey: string; show: boolean; badge?: number }> = [
    { href: `${base}/overview`, labelKey: "org.tabs.overview", show: true },
    { href: `${base}`, labelKey: "org.tabs.detail", show: true },
    { href: `${base}/employees`, labelKey: "org.tabs.employees", show: isAdmin },
    {
      href: `${base}/emission-logs/review`,
      labelKey: "org.tabs.review",
      show: isAdmin,
      badge: pendingReviews,
    },
    { href: `${base}/emission-logs/report`, labelKey: "org.tabs.report", show: true },
    { href: `${base}/compliance`, labelKey: "org.tabs.compliance", show: isAdmin },
    { href: `${base}/settings`, labelKey: "org.tabs.settings", show: isAdmin },
  ];

  return (
    <nav className="flex gap-1 border-b border-[#E5E7EB] mb-2 overflow-x-auto" aria-label="Organization tabs">
      {tabs
        .filter((t) => t.show)
        .map((tab) => {
          // Detail tab is "active" only when path equals base exactly.
          const active =
            tab.href === base
              ? pathname === base
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition flex items-center gap-2 ${
                active
                  ? "text-[#155A03] border-b-2 border-[#155A03] -mb-px"
                  : "text-[#6E726E] hover:text-[#155A03]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {t(tab.labelKey)}
              {tab.badge && tab.badge > 0 ? (
                <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  {tab.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}
