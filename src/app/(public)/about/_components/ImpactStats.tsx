"use client";

import { useTranslation } from "react-i18next";
import type { PublicImpactStats } from "@/services/public-stats.service";

export function ImpactStats({ stats }: { stats: PublicImpactStats }) {
  const { t } = useTranslation();

  const tonnes = stats.totalCo2eKg / 1000;

  const ITEMS = [
    {
      labelKey: "about.impact.organizations",
      value: stats.organizations.toLocaleString(),
    },
    {
      labelKey: "about.impact.users",
      value: stats.users.toLocaleString(),
    },
    {
      labelKey: "about.impact.emissionLogs",
      value: stats.emissionLogs.toLocaleString(),
    },
    {
      labelKey: "about.impact.co2Tracked",
      value: `${tonnes.toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {ITEMS.map((item) => (
        <div
          key={item.labelKey}
          className="bg-white border border-[#DAEDD5] rounded-2xl p-6 text-center shadow-[0px_2px_8px_rgba(218,237,213,0.4)]"
        >
          <div className="text-[#1F8505] text-2xl sm:text-3xl font-bold">{item.value}</div>
          <div className="text-[#6E726E] text-sm mt-2">{t(item.labelKey)}</div>
        </div>
      ))}
    </div>
  );
}
