"use client";

import { useTranslation } from "react-i18next";
import type { SubscriptionMix } from "@/types/admin.types";

/** Cycles through brand-aligned colours so each plan gets a unique chip. */
const COLORS = ["#1F8505", "#1F6FEB", "#7C3AED", "#F59E0B", "#E11D48"];

export function SubscriptionMixCard({ mix }: { mix: SubscriptionMix }) {
  const { t } = useTranslation();

  if (mix.totalActive === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.dashboard.subs.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-neutral-muted text-xs uppercase tracking-wide">
          {t("admin.dashboard.subs.totalActive")}
        </span>
        <span className="text-brand-700 text-2xl font-bold">
          {mix.totalActive.toLocaleString()}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {mix.byPlan.map((p, i) => {
          const pct = (p.count / mix.totalActive) * 100;
          const color = COLORS[i % COLORS.length];
          return (
            <li key={p.plan_name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-neutral-fg inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {p.plan_name}
                </span>
                <span className="text-brand-700 font-semibold">
                  {p.count.toLocaleString()}
                  <span className="text-neutral-soft ml-2 text-xs font-normal">
                    {pct.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="bg-brand-50 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
