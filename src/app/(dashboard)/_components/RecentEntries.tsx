"use client";

import { useTranslation } from "react-i18next";
import { RECENT_ENTRIES } from "../_data/mock";

const STATUS_STYLES = {
  success: { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" },
  warning: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
};

export function RecentEntries() {
  const { t } = useTranslation();

  return (
    <div className="bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden rounded-3xl border border-[#B8D6B0] flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-[#B8D6B0] flex items-center justify-between">
        <h2 className="text-[#145A03] text-base font-bold leading-6">
          {t("dashboard.recentEntries.title")}
        </h2>
        <button className="text-[#155A03] text-xs font-bold leading-4 bg-transparent border-none cursor-pointer hover:underline">
          {t("dashboard.recentEntries.viewAll")}
        </button>
      </div>

      {/* Table */}
      <div className="w-full">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_0.8fr_0.6fr_0.7fr] bg-[#DAEDD5]">
          {RECENT_ENTRIES.columns.map((col) => (
            <div key={col} className="px-6 py-4 flex items-center justify-center">
              <span className="text-[#3B3D3B] text-sm font-bold leading-5">
                {col}
              </span>
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {RECENT_ENTRIES.rows.map((row, i) => {
          const styles = STATUS_STYLES[row.statusColor];
          return (
            <div
              key={i}
              className={`grid grid-cols-[1fr_0.8fr_0.6fr_0.7fr] ${
                i > 0 ? "border-t border-[#B8D6B0]" : ""
              }`}
            >
              <div className="px-6 py-4 flex flex-col justify-center">
                <span className="text-[#145A03] text-sm font-bold leading-5 whitespace-pre-line">
                  {row.asset}
                </span>
                <span className="text-[#6E726E] text-xs font-normal leading-4 font-[Manrope]">
                  {row.location}
                </span>
              </div>

              <div className="px-6 py-4 flex items-center justify-center">
                <span className="text-[#145A03] text-sm font-normal leading-5 font-[Manrope] whitespace-pre-line text-center">
                  {row.category}
                </span>
              </div>

              <div className="px-6 py-4 flex items-center justify-center">
                <span className="text-[#145A03] text-sm font-bold leading-5">
                  {row.quantity}
                </span>
              </div>

              <div className="px-6 py-4 flex items-center justify-center">
                <span
                  className={`px-2 py-0.5 ${styles.bg} rounded ${styles.text} text-[10px] font-bold leading-5`}
                >
                  {row.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
