"use client";

import { useTranslation } from "react-i18next";
import type { EmissionLogStatusCounts } from "@/types/admin.types";

/** Order matters: this is the lifecycle order shown in the chart. */
const ROWS: Array<{
  key: keyof EmissionLogStatusCounts;
  labelKey: string;
  color: string;
}> = [
  {
    key: "pending",
    labelKey: "admin.dashboard.status.pending",
    color: "#F59E0B",
  },
  {
    key: "review",
    labelKey: "admin.dashboard.status.review",
    color: "#3B82F6",
  },
  {
    key: "verified",
    labelKey: "admin.dashboard.status.verified",
    color: "#1F8505",
  },
  {
    key: "published",
    labelKey: "admin.dashboard.status.published",
    color: "#155A03",
  },
  {
    key: "exported",
    labelKey: "admin.dashboard.status.exported",
    color: "#6B7280",
  },
];

/** Stacked bar + legend showing where activity logs sit in the workflow. */
export function StatusBreakdown({ counts }: { counts: EmissionLogStatusCounts }) {
  const { t } = useTranslation();
  const total = ROWS.reduce((s, r) => s + counts[r.key], 0);

  if (total === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.dashboard.status.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-brand-50 flex h-3 w-full overflow-hidden rounded-full">
        {ROWS.map((r) => {
          const pct = (counts[r.key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={r.key}
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: r.color }}
              title={`${t(r.labelKey)}: ${counts[r.key]}`}
            />
          );
        })}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {ROWS.map((r) => (
          <li
            key={r.key}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-neutral-fg inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              {t(r.labelKey)}
            </span>
            <span className="text-brand-700 font-semibold">
              {counts[r.key].toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
