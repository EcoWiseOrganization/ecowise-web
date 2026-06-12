"use client";

import { useTranslation } from "react-i18next";
import { formatInt } from "@/lib/format-number";

interface ActorRoleSplitProps {
  rows: Array<{ role: string; count: number }>;
}

/** Cycles through brand colours so each role gets its own chip. */
const COLORS = ["#1F8505", "#1F6FEB", "#7C3AED", "#F59E0B", "#E11D48", "#6B7280"];

/** Who triggered audited actions, grouped by role. */
export function ActorRoleSplit({ rows }: ActorRoleSplitProps) {
  const { t } = useTranslation();
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (total === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.systemOverview.audit.emptyRoles")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-brand-50 flex h-2.5 w-full overflow-hidden rounded-full">
        {rows.map((r, i) => {
          const pct = (r.count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={r.role}
              className="h-full"
              style={{
                width: `${pct}%`,
                backgroundColor: COLORS[i % COLORS.length],
              }}
              title={`${r.role}: ${r.count}`}
            />
          );
        })}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => {
          const pct = (r.count / total) * 100;
          return (
            <li
              key={r.role}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-neutral-fg inline-flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                {r.role}
              </span>
              <span className="text-brand-700 font-semibold">
                {formatInt(r.count)}
                <span className="text-neutral-soft ml-2 text-xs font-normal">
                  {pct.toFixed(1)}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
