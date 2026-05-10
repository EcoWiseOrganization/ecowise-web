"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPersonalStatsAction } from "@/app/actions/personal-carbon.actions";

type Stats = {
  total: number;
  byScope: Record<string, number>;
  byCategory: { name: string; co2eKg: number }[];
  logCount: number;
};

const PERIODS = [
  { value: "month", labelKey: "reports.period.month" },
  { value: "quarter", labelKey: "reports.period.quarter" },
  { value: "year", labelKey: "reports.period.year" },
] as const;

function rangeFor(period: (typeof PERIODS)[number]["value"]): {
  start: string;
  end: string;
} {
  const end = new Date();
  const start = new Date();
  if (period === "month") start.setMonth(end.getMonth() - 1);
  else if (period === "quarter") start.setMonth(end.getMonth() - 3);
  else start.setFullYear(end.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function PersonalReport() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>(
    "month"
  );
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { start, end } = rangeFor(period);
      const res = await getPersonalStatsAction(start, end);
      if (!active) return;
      setStats(res.data ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [period]);

  if (loading || !stats) {
    return (
      <div className="bg-white rounded-2xl border border-[#DAEDD5] p-12 text-center text-sm text-[#6E726E]">
        {t("common.loading")}
      </div>
    );
  }

  const total = stats.total;
  const top = [...stats.byCategory]
    .sort((a, b) => b.co2eKg - a.co2eKg)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex border border-[#DAEDD5] rounded-lg overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setLoading(true);
                setPeriod(p.value);
              }}
              className={`px-4 py-2 text-sm ${
                period === p.value
                  ? "bg-[#155A03] text-white"
                  : "bg-white text-[#6E726E]"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <span className="text-xs text-[#AAAAAA]">
          {stats.logCount} {t("reports.logs")}
        </span>
      </div>

      {/* Summary card */}
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <div className="text-xs uppercase text-[#6E726E]">
          {t("reports.totalCO2e")}
        </div>
        <div className="text-3xl font-bold text-[#155A03] mt-1">
          {total.toFixed(2)} kg
        </div>
      </div>

      {/* Scope breakdown */}
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <h3 className="text-[#155A03] text-base font-semibold mb-3">
          {t("reports.byScope")}
        </h3>
        <div className="space-y-3">
          {(["Scope 1", "Scope 2", "Scope 3"] as const).map((s) => {
            const v = stats.byScope[s] ?? 0;
            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
            return (
              <div key={s}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{s}</span>
                  <span className="font-medium">
                    {v.toFixed(2)} kg ({pct}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1F8505]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top categories */}
      <div className="bg-white border border-[#DAEDD5] rounded-2xl p-6">
        <h3 className="text-[#155A03] text-base font-semibold mb-3">
          {t("reports.topCategories")}
        </h3>
        {top.length === 0 ? (
          <p className="text-sm text-[#AAAAAA]">{t("reports.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {top.map((c) => (
              <li
                key={c.name}
                className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
              >
                <span>{c.name}</span>
                <span className="font-semibold text-[#155A03]">
                  {c.co2eKg.toFixed(2)} kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
