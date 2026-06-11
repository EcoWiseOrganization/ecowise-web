"use client";

import ShowChartIcon from "@mui/icons-material/ShowChart";
import { useTranslation } from "react-i18next";

interface Props {
  scope3Kg: number;
  totalKg: number;
  /** Largest contributing category inside Scope 3 (e.g. "Travel"). */
  topCategory: string | null;
}

export function Scope3Card({ scope3Kg, totalKg, topCategory }: Props) {
  const { t } = useTranslation();
  const tonnes = scope3Kg / 1000;
  const showInKg = tonnes < 0.1 && scope3Kg > 0;
  const displayValue = showInKg
    ? scope3Kg.toFixed(2)
    : tonnes.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const displayUnit = showInKg ? "kgCO₂e" : "tCO₂e";
  const percentOfTotal =
    totalKg > 0 ? Math.round((scope3Kg / totalKg) * 100) : 0;

  return (
    <div className="min-w-0 p-4 sm:p-6 bg-[linear-gradient(135deg,white_0%,rgba(248,250,252,0.5)_100%)] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px] truncate">
          {t("dashboard.scope3")}
        </span>
        <ShowChartIcon sx={{ fontSize: 15, color: "#79B669" }} className="shrink-0" />
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[#1F8505] text-2xl sm:text-3xl xl:text-4xl font-extrabold leading-tight">
          {displayValue}
        </span>
        <span className="text-[#AAAAAA] text-base font-bold leading-6">
          {displayUnit}
        </span>
      </div>

      <div className="flex items-start gap-2 flex-wrap">
        {topCategory ? (
          <span className="px-2 py-0.5 bg-[#DAEDD5] rounded text-[#1F8505] text-[9px] font-bold uppercase leading-[13.5px]">
            {t("dashboard.hotspotPrefix")}: {topCategory}
          </span>
        ) : null}
        <span className="px-2 py-0.5 bg-[#79B669] rounded text-white text-[9px] font-bold leading-[13.5px]">
          {t("dashboard.percentOfTotal", { value: percentOfTotal })}
        </span>
      </div>
    </div>
  );
}
