"use client";

import BarChartIcon from "@mui/icons-material/BarChart";
import { useTranslation } from "react-i18next";
import { INTENSITY_METRICS } from "../_data/mock";

export function IntensityMetrics() {
  const { t } = useTranslation();

  return (
    <div className="p-8 bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] rounded-3xl border border-[#B8D6B0] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChartIcon sx={{ fontSize: 20, color: "#155A03" }} />
        <h2 className="text-[#145A03] text-base font-bold leading-6">
          {t("dashboard.intensityMetrics.title")}
        </h2>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-6">
        {INTENSITY_METRICS.map(({ label, value, progress, color }) => (
          <div key={label} className="flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <span className="text-[#7AB669] text-xs font-bold leading-4">
                {label}
              </span>
              <span className="text-xs font-bold leading-4" style={{ color }}>
                {value}
              </span>
            </div>
            <div className="h-2 bg-[#E5E5E5] rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${progress}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
