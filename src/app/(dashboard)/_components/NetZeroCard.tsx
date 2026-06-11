"use client";

import Link from "next/link";
import PublicIcon from "@mui/icons-material/Public";
import { useTranslation } from "react-i18next";
import type { CarbonTargetWithProgress } from "@/types/target.types";

interface Props {
  target: CarbonTargetWithProgress | null;
}

/**
 * Net-zero progress card. When the user has an active personal target
 * we render the live progress ring + reduction stats from the DB.
 * Otherwise we drop into a call-to-action that links to /dashboard/targets
 * so the empty card never looks "broken" — it always either reports
 * progress or asks the user to set a goal.
 */
export function NetZeroCard({ target }: Props) {
  const { t } = useTranslation();

  if (!target) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 bg-[#79B669] rounded-3xl border border-[#B8D6B0] flex flex-col gap-4 min-w-0 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#155A03] rounded-full flex items-center justify-center shrink-0">
            <PublicIcon sx={{ fontSize: 17, color: "white" }} />
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-white text-xl font-extrabold leading-[25px] truncate">
              {t("dashboard.netZero.titleEmpty")}
            </span>
            <span className="text-[#DAEDD5] text-xs font-medium leading-4">
              {t("dashboard.netZero.subtitleEmpty")}
            </span>
          </div>
        </div>
        <p className="text-sm text-white/90 leading-5">
          {t("dashboard.netZero.bodyEmpty")}
        </p>
        <Link
          href="/dashboard/targets"
          className="self-start px-4 py-2.5 bg-[#155A03] rounded-xl text-white text-sm font-bold no-underline hover:brightness-110 transition-all"
        >
          {t("dashboard.netZero.setGoal")}
        </Link>
      </div>
    );
  }

  const reductionPct = Math.max(
    0,
    Math.min(100, Math.round(target.progress_pct * 100)),
  );
  const currentKg = Number(target.current_co2e) || 0;
  const baselineKg = Number(target.baseline_co2e) || 0;
  const targetKg = Number(target.target_co2e) || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#79B669] rounded-3xl border border-[#B8D6B0] flex flex-col gap-6 lg:gap-8 min-w-0">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#155A03] rounded-full flex items-center justify-center shrink-0">
          <PublicIcon sx={{ fontSize: 17, color: "white" }} />
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-white text-xl font-extrabold leading-[25px] truncate">
            {target.name}
          </span>
          <span className="text-[#3B3D3B] text-xs font-bold uppercase leading-4 tracking-[1.2px]">
            {t("dashboard.netZero.commitment")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="flex flex-col">
            <span className="text-white text-[30px] font-extrabold leading-9 tabular-nums">
              {reductionPct}%
            </span>
            <span className="text-[#3B3D3B] text-xs font-medium leading-4">
              {t("dashboard.netZero.reductionAchieved")}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-white text-sm font-bold leading-5">
              {t("dashboard.netZero.targetByDate", {
                value: targetKg.toLocaleString(undefined, { maximumFractionDigits: 2 }),
                date: target.end_date,
              })}
            </span>
            <span
              className={`text-xs font-semibold leading-4 ${
                target.on_track ? "text-[#155A03]" : "text-[#92400E]"
              }`}
            >
              {target.on_track
                ? t("dashboard.netZero.onTrack")
                : t("dashboard.netZero.offTrack")}
            </span>
          </div>
        </div>

        <div className="relative h-4 bg-[#E5E5E5] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#155A03] rounded-full shadow-[0px_0px_15px_rgba(25,230,107,0.4)]"
            style={{ width: `${reductionPct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0 p-3 sm:p-4 bg-white/80 rounded-2xl flex flex-col gap-1">
            <span className="text-[#3B3D3B] text-[10px] font-bold uppercase leading-[15px]">
              {t("dashboard.netZero.baseline")}
            </span>
            <span className="text-[#155A03] text-sm font-bold leading-5">
              {baselineKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kgCO₂e
            </span>
          </div>
          <div className="min-w-0 p-3 sm:p-4 bg-white/80 rounded-2xl flex flex-col gap-1">
            <span className="text-[#3B3D3B] text-[10px] font-bold uppercase leading-[15px]">
              {t("dashboard.netZero.currentToDate")}
            </span>
            <span className="text-[#155A03] text-sm font-bold leading-5">
              {currentKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kgCO₂e
            </span>
          </div>
        </div>

        <Link
          href="/dashboard/targets"
          className="w-full py-3 bg-[#155A03] rounded-xl text-white text-sm font-bold leading-5 text-center no-underline hover:brightness-110 transition-all"
        >
          {t("dashboard.netZero.viewRoadmap")}
        </Link>
      </div>
    </div>
  );
}
