"use client";

import { useTranslation } from "react-i18next";

interface Props {
  scope1Kg: number;
  totalKg: number;
}

export function Scope1Card({ scope1Kg, totalKg }: Props) {
  const { t } = useTranslation();
  const tonnes = scope1Kg / 1000;
  const showInKg = tonnes < 0.1 && scope1Kg > 0;
  const displayValue = showInKg
    ? scope1Kg.toFixed(2)
    : tonnes.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const displayUnit = showInKg ? "kgCO₂e" : "tCO₂e";

  const percentage =
    totalKg > 0 ? Math.round((scope1Kg / totalKg) * 100) : 0;

  return (
    <div className="min-w-0 p-4 sm:p-6 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-2xl border border-[#B8D6B0] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[0.6px] truncate">
          {t("dashboard.scope1")}
        </span>
        <span className="shrink-0 px-2 py-1 bg-[#DAEDD5] rounded-full text-[#1F8505] text-[10px] font-bold leading-[15px]">
          {t("dashboard.directLabel")}
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

      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 bg-[#DAEDD5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1F8505] rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="shrink-0 text-[#3B3D3B] text-[10px] font-bold leading-[15px]">
          {t("dashboard.percentOfTotal", { value: percentage })}
        </span>
      </div>
    </div>
  );
}
