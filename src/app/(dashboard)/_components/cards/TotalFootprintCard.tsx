"use client";

import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useTranslation } from "react-i18next";

interface Props {
  /** Total kg CO2e logged inside the active dashboard window. */
  totalKg: number;
  /** Number of logs included in the figure — surfaced as a sub-line. */
  logCount: number;
  /** Year label rendered next to the title (e.g. 2026). */
  year: number;
}

export function TotalFootprintCard({ totalKg, logCount, year }: Props) {
  const { t } = useTranslation();
  const totalTonnes = totalKg / 1000;
  // For < 0.1 t we still show kgs so the user sees movement rather
  // than a stuck-at-zero card on their first few logs.
  const showInKg = totalTonnes < 0.1 && totalKg > 0;
  const displayValue = showInKg
    ? totalKg.toFixed(2)
    : totalTonnes.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const displayUnit = showInKg ? "kgCO₂e" : "tCO₂e";

  return (
    <div className="min-w-0 p-4 sm:p-6 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px] truncate">
          {t("dashboard.totalFootprint")}
        </span>
        <span className="shrink-0 px-2 py-1 bg-[#79B669] rounded-full text-white text-[10px] font-bold leading-[15px]">
          {t("dashboard.year", { value: year })}
        </span>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[#1F8505] text-2xl sm:text-3xl xl:text-4xl font-extrabold leading-tight">
          {displayValue}
        </span>
        <span className="text-[#AAAAAA] text-base font-bold leading-6">
          {displayUnit}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <TrendingUpIcon sx={{ fontSize: 12, color: "#79B669" }} />
        <span className="text-[#6E726E] text-xs font-normal leading-4 font-[Manrope]">
          {t("dashboard.totalFootprintNote", { count: logCount })}
        </span>
      </div>
    </div>
  );
}
