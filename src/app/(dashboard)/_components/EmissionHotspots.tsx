"use client";

import { useTranslation } from "react-i18next";

interface Bucket {
  name: string;
  co2eKg: number;
}

interface Props {
  /** byCategory list from the dashboard data fetcher. */
  buckets: Bucket[];
}

/**
 * Personal-dashboard hotspots panel — a sorted horizontal bar chart
 * over the user's logged emission categories. Shows the top 6 by
 * mass to keep the layout stable, with each bar scaled to the
 * largest contributor in the window. An empty-state hint replaces
 * the chart when there are no logs yet so the card never shows
 * stale zeros.
 */
export function EmissionHotspots({ buckets }: Props) {
  const { t } = useTranslation();
  const sorted = [...buckets]
    .filter((b) => b.co2eKg > 0)
    .sort((a, b) => b.co2eKg - a.co2eKg)
    .slice(0, 6);
  const maxKg = sorted[0]?.co2eKg ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-3xl border border-[#B8D6B0] flex flex-col gap-6 lg:gap-8 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <h2 className="text-[#145A03] text-lg font-extrabold leading-7">
            {t("dashboard.hotspots.title")}
          </h2>
          <p className="text-[#6E726E] text-sm font-normal leading-5 font-[Manrope]">
            {t("dashboard.hotspots.subtitle")}
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#AAAAAA]">
          {t("dashboard.empty.noLogs")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((b) => {
            const widthPct = maxKg > 0 ? (b.co2eKg / maxKg) * 100 : 0;
            const tonnes = b.co2eKg / 1000;
            const showInKg = tonnes < 0.1 && b.co2eKg > 0;
            return (
              <div key={b.name} className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[#145A03] text-sm font-semibold truncate">
                    {b.name}
                  </span>
                  <span className="shrink-0 text-[#3B3D3B] text-xs font-bold">
                    {showInKg
                      ? `${b.co2eKg.toFixed(2)} kgCO₂e`
                      : `${tonnes.toLocaleString(undefined, { maximumFractionDigits: 2 })} tCO₂e`}
                  </span>
                </div>
                <div className="h-2.5 bg-[#DAEDD5] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7AB669] rounded-full"
                    style={{ width: `${Math.max(2, widthPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
