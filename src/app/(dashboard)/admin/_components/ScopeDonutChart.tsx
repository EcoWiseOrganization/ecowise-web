"use client";

import { useTranslation } from "react-i18next";
import type { ScopeTotal } from "@/types/admin.types";

/** Scope → brand-aligned colour (Scope 1 fuel, 2 electricity, 3 indirect). */
const SCOPE_COLOR: Record<ScopeTotal["scope"], string> = {
  "Scope 1": "#F59E0B",
  "Scope 2": "#1F8505",
  "Scope 3": "#1F6FEB",
};

interface ScopeDonutChartProps {
  scopes: ScopeTotal[];
}

const SIZE = 200;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

/** Donut showing share of total CO₂e tracked per GHG scope. */
export function ScopeDonutChart({ scopes }: ScopeDonutChartProps) {
  const { t } = useTranslation();
  const total = scopes.reduce((s, r) => s + r.total_co2e_kg, 0);

  if (total <= 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.dashboard.scope.empty")}
      </p>
    );
  }

  // Each arc starts where the previous one ended. We compute the cumulative
  // pct upfront so the render is purely functional (no mutated closure).
  const cumulative: number[] = [];
  scopes.reduce((acc, r, i) => {
    cumulative[i] = acc;
    return acc + r.total_co2e_kg / total;
  }, 0);
  const arcs = scopes.map((r, i) => {
    const pct = r.total_co2e_kg / total;
    return {
      scope: r.scope,
      color: SCOPE_COLOR[r.scope],
      pct,
      dasharray: `${pct * CIRC} ${CIRC}`,
      dashoffset: -cumulative[i] * CIRC,
    };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Track ring */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#F1F5F1"
            strokeWidth={STROKE}
          />
          {/* Segments — rotated so the first segment starts at 12 o'clock */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map((a) => (
              <circle
                key={a.scope}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={a.color}
                strokeWidth={STROKE}
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.dashoffset}
                strokeLinecap="butt"
              >
                <title>{`${a.scope}: ${(a.pct * 100).toFixed(1)}%`}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-neutral-muted text-xs uppercase tracking-wide">
            {t("admin.dashboard.scope.total")}
          </span>
          <span className="text-brand-700 text-lg font-bold">
            {formatKg(total)}
          </span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-2 sm:w-auto sm:flex-1">
        {scopes.map((r) => {
          const pct = total > 0 ? (r.total_co2e_kg / total) * 100 : 0;
          return (
            <li
              key={r.scope}
              className="flex items-center justify-between gap-3"
            >
              <span className="text-neutral-fg inline-flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SCOPE_COLOR[r.scope] }}
                />
                {r.scope}
                <span className="text-neutral-soft text-xs">
                  · {r.log_count.toLocaleString()}
                </span>
              </span>
              <span className="text-brand-700 text-sm font-semibold">
                {pct.toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatKg(kg: number) {
  if (kg >= 1000) {
    return `${(kg / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })} tCO₂e`;
  }
  return `${kg.toFixed(1)} kg`;
}
