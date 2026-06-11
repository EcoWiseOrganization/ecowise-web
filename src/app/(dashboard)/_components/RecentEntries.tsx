"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { EmissionLogWithCategory } from "@/types/emission-log.types";

interface Props {
  logs: EmissionLogWithCategory[];
}

const STATUS_STYLES = {
  Verified: { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" },
  Published: { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" },
  Exported: { bg: "bg-[#DCFCE7]", text: "text-[#15803D]" },
  Review: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
  Pending: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]" },
  Rejected: { bg: "bg-[#FEE2E2]", text: "text-[#B91C1C]" },
} as const;

export function RecentEntries({ logs }: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-white shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden rounded-3xl border border-[#B8D6B0] flex flex-col min-w-0">
      <div className="px-4 sm:px-6 py-4 sm:py-6 border-b border-[#B8D6B0] flex items-center justify-between gap-2">
        <h2 className="text-[#145A03] text-base font-bold leading-6 truncate">
          {t("dashboard.recentEntries.title")}
        </h2>
        <Link
          href="/dashboard/activity"
          className="shrink-0 text-[#155A03] text-xs font-bold leading-4 bg-transparent border-none no-underline cursor-pointer hover:underline"
        >
          {t("dashboard.recentEntries.viewAll")}
        </Link>
      </div>

      {logs.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-[#AAAAAA]">
          {t("dashboard.empty.noLogs")}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[1fr_0.8fr_0.6fr_0.7fr] bg-[#DAEDD5]">
              {[
                "dashboard.recentEntries.colActivity",
                "dashboard.recentEntries.colCategory",
                "dashboard.recentEntries.colCo2e",
                "dashboard.recentEntries.colStatus",
              ].map((k) => (
                <div key={k} className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center">
                  <span className="text-[#3B3D3B] text-sm font-bold leading-5">
                    {t(k)}
                  </span>
                </div>
              ))}
            </div>

            {logs.map((log, i) => {
              const styles =
                STATUS_STYLES[log.status as keyof typeof STATUS_STYLES] ??
                STATUS_STYLES.Pending;
              const tonnes = Number(log.co2e_result ?? 0);  // server already stores tonnes
              const tonnesDisplay = tonnes.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              });
              return (
                <div
                  key={log.id}
                  className={`grid grid-cols-[1fr_0.8fr_0.6fr_0.7fr] ${
                    i > 0 ? "border-t border-[#B8D6B0]" : ""
                  }`}
                >
                  <div className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col justify-center">
                    <span className="text-[#145A03] text-sm font-bold leading-5">
                      {log.activity_name}
                    </span>
                    <span className="text-[#6E726E] text-xs font-normal leading-4 font-[Manrope]">
                      {log.reporting_date}
                    </span>
                  </div>

                  <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center">
                    <span className="text-[#145A03] text-sm font-normal leading-5 font-[Manrope] text-center">
                      {log.category?.name ?? log.scope}
                    </span>
                  </div>

                  <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center">
                    <span className="text-[#145A03] text-sm font-bold leading-5">
                      {tonnesDisplay} tCO₂e
                    </span>
                  </div>

                  <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center">
                    <span
                      className={`px-2 py-0.5 ${styles.bg} rounded ${styles.text} text-[10px] font-bold leading-5`}
                    >
                      {t(`dashboard.status.${log.status}`, {
                        defaultValue: log.status,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
