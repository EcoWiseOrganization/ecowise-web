"use client";

import { useTranslation } from "react-i18next";
import type { SectorTotal } from "@/types/admin.types";
import { formatKg } from "@/lib/format-number";

interface SectorBarChartProps {
  sectors: SectorTotal[];
  /** Max rows rendered; the rest are summarised as "Other". */
  topN?: number;
}

/** Horizontal bar chart of top industries by tracked CO₂e. */
export function SectorBarChart({ sectors, topN = 6 }: SectorBarChartProps) {
  const { t } = useTranslation();

  if (sectors.length === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.dashboard.sectors.empty")}
      </p>
    );
  }

  const top = sectors.slice(0, topN);
  const rest = sectors.slice(topN);
  const restTotal = rest.reduce((s, r) => s + r.total_co2e_kg, 0);
  const restOrgs = rest.reduce((s, r) => s + r.org_count, 0);
  const rows =
    rest.length > 0
      ? [
          ...top,
          {
            industry: t("admin.dashboard.sectors.other"),
            total_co2e_kg: Math.round(restTotal * 100) / 100,
            org_count: restOrgs,
          },
        ]
      : top;

  const max = Math.max(1, ...rows.map((r) => r.total_co2e_kg));

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const pct = Math.max(2, Math.round((r.total_co2e_kg / max) * 100));
        return (
          <li key={r.industry} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span
                className="text-neutral-fg truncate font-medium"
                title={r.industry}
              >
                {r.industry}
              </span>
              <span className="text-brand-700 shrink-0 font-semibold">
                {formatKg(r.total_co2e_kg)}
                <span className="text-neutral-soft ml-2 text-xs font-normal">
                  · {r.org_count}{" "}
                  {t("admin.dashboard.sectors.orgsAbbr")}
                </span>
              </span>
            </div>
            <div className="bg-brand-50 h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-brand-500 h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

