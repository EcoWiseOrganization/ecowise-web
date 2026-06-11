"use client";

import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  onAddEmission?: () => void;
  /** Year of the dashboard window (derived from useDashboardData). */
  year: number;
  /** "YYYY-MM-DD" range start. */
  rangeStart: string;
  /** "YYYY-MM-DD" range end. */
  rangeEnd: string;
  /** Driven from useDashboardData.setRange; updates both halves. */
  onRangeChange: (start: string, end: string) => void;
}

export function DashboardHeader({
  onAddEmission,
  year,
  rangeStart,
  rangeEnd,
  onRangeChange,
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  // Don't let the user pick a window that extends into the future —
  // we have no data past `today` and an empty period reads as "you
  // logged 0 this year" which is misleading.
  const todayIso = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col">
        <h1 className="text-[#155A03] text-2xl sm:text-[30px] font-semibold leading-9">
          {t("page.dashboard.title")}
        </h1>
        <p className="text-sm sm:text-base">
          <span className="text-[#AAAAAA] font-medium leading-6">
            {t("page.dashboard.monitoringFor")}{" "}
          </span>
          <span className="text-[#79B669] font-bold">
            {t("dashboard.auditCycle", { year })}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {/* Real range picker — every field change kicks the dashboard
            fetcher via onRangeChange. The chip stays compact on mobile
            by reusing the native date input UI. */}
        <div className="px-3 py-1.5 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-xl border border-[#E2E8F0] flex items-center gap-2">
          <CalendarTodayIcon sx={{ fontSize: 18, color: "#79B669" }} />
          <input
            type="date"
            value={rangeStart}
            max={rangeEnd || todayIso}
            onChange={(e) => onRangeChange(e.target.value, rangeEnd)}
            aria-label={t("dashboard.rangeStartLabel")}
            className="text-[#155A03] text-xs sm:text-sm leading-5 bg-transparent border-none outline-none cursor-pointer focus:text-[#1F8505]"
          />
          <span className="text-[#79B669] text-xs sm:text-sm">→</span>
          <input
            type="date"
            value={rangeEnd}
            min={rangeStart}
            max={todayIso}
            onChange={(e) => onRangeChange(rangeStart, e.target.value)}
            aria-label={t("dashboard.rangeEndLabel")}
            className="text-[#155A03] text-xs sm:text-sm leading-5 bg-transparent border-none outline-none cursor-pointer focus:text-[#1F8505]"
          />
        </div>

        <button
          onClick={onAddEmission}
          className="relative px-4 sm:px-6 py-2 sm:py-2.5 bg-[#1F8505] rounded-xl flex items-center gap-2 shadow-[0px_2px_4px_rgba(218,237,213,0.25)] cursor-pointer border-none hover:brightness-110 transition-all"
        >
          <AddIcon sx={{ fontSize: 14, color: "white" }} />
          <span className="text-white text-sm font-bold leading-6">
            {t("page.dashboard.addEmission")}
          </span>
        </button>
      </div>
    </div>
  );
}
