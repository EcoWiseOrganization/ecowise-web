"use client";

import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import { AUDIT_CYCLE, DATE_RANGE } from "../_data/mock";
import { useTranslation } from "react-i18next";

interface DashboardHeaderProps {
  onAddEmission?: () => void;
}

export function DashboardHeader({ onAddEmission }: DashboardHeaderProps) {
  const { t } = useTranslation();
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
          <span className="text-[#79B669] font-bold">{AUDIT_CYCLE}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        {/* Date Range Picker */}
        <button className="h-10 sm:h-11 px-3 sm:px-4 py-2 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-xl border border-[#E2E8F0] flex items-center gap-2 sm:gap-3 cursor-pointer">
          <CalendarTodayIcon sx={{ fontSize: 18, color: "#79B669" }} />
          <span className="text-[#155A03] text-xs sm:text-sm leading-5">
            {DATE_RANGE}
          </span>
          <KeyboardArrowDownIcon sx={{ fontSize: 11, color: "#79B669" }} />
        </button>

        {/* Add Emission Button */}
        <button
          onClick={onAddEmission}
          className="relative px-4 sm:px-6 py-2 sm:py-2.5 bg-[#1F8505] rounded-xl flex items-center gap-2 shadow-[0px_2px_4px_rgba(218,237,213,0.25)] cursor-pointer border-none hover:brightness-110 transition-all"
        >
          <AddIcon sx={{ fontSize: 14, color: "white" }} />
          <span className="text-white text-sm sm:text-base font-bold leading-6">
            {t("page.dashboard.addEmission")}
          </span>
        </button>
      </div>
    </div>
  );
}
