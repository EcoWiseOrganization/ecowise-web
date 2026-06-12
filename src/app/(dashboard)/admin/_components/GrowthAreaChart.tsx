"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { GrowthBucket } from "@/types/admin.types";

interface Series {
  key: keyof Pick<GrowthBucket, "newUsers" | "newOrganizations" | "newEmissionLogs">;
  labelKey: string;
  color: string;
}

const SERIES: Series[] = [
  { key: "newUsers", labelKey: "admin.dashboard.growth.users", color: "#1F8505" },
  {
    key: "newOrganizations",
    labelKey: "admin.dashboard.growth.orgs",
    color: "#1F6FEB",
  },
  {
    key: "newEmissionLogs",
    labelKey: "admin.dashboard.growth.logs",
    color: "#F59E0B",
  },
];

const W = 800;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 30, left: 36 };

/**
 * Layered area + line chart of monthly growth across 3 metrics.
 * Pure SVG so it ships zero JS deps and scales perfectly to any width.
 */
export function GrowthAreaChart({ buckets }: { buckets: GrowthBucket[] }) {
  const { t } = useTranslation();
  const reactId = useId();

  if (buckets.length === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.dashboard.growth.empty")}
      </p>
    );
  }

  const max = Math.max(
    1,
    ...buckets.flatMap((b) => [b.newUsers, b.newOrganizations, b.newEmissionLogs])
  );
  const niceMax = niceCeil(max);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const stepX = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;
  const xAt = (i: number) => PAD.left + i * stepX;
  const yAt = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;

  const gridLines = 4;

  return (
    <figure className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <span
            key={s.key}
            className="text-neutral-muted inline-flex items-center gap-1.5 text-xs"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {t(s.labelKey)}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[260px] w-full"
        role="img"
        aria-label={t("admin.dashboard.growth.title")}
      >
        {/* Y-axis grid lines + labels */}
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const v = Math.round((niceMax / gridLines) * (gridLines - i));
          const y = PAD.top + (innerH / gridLines) * i;
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="#E5E7EB"
                strokeDasharray={i === gridLines ? "0" : "3 3"}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9CA3AF"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Series (area + line) */}
        {SERIES.map((s) => {
          const gradId = `${reactId}-${s.key}`;
          const linePath = buckets
            .map((b, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(b[s.key])}`)
            .join(" ");
          const areaPath = `${linePath} L ${xAt(buckets.length - 1)} ${PAD.top + innerH} L ${xAt(0)} ${PAD.top + innerH} Z`;
          return (
            <g key={s.key}>
              <defs>
                <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill={`url(#${gradId})`} />
              <path d={linePath} stroke={s.color} strokeWidth={2} fill="none" />
              {buckets.map((b, i) => (
                <circle
                  key={i}
                  cx={xAt(i)}
                  cy={yAt(b[s.key])}
                  r={2.5}
                  fill="#FFFFFF"
                  stroke={s.color}
                  strokeWidth={1.5}
                >
                  <title>{`${b.month} — ${t(s.labelKey)}: ${b[s.key]}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* X-axis labels (compact MM) */}
        {buckets.map((b, i) => (
          <text
            key={b.month}
            x={xAt(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fill="#9CA3AF"
          >
            {b.month.slice(5)}
          </text>
        ))}
      </svg>
    </figure>
  );
}

/** Round up to a "nice" axis ceiling so the top of the chart never clips data. */
function niceCeil(n: number): number {
  if (n <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const s of steps) {
    const cap = s * pow;
    if (n <= cap) return cap;
  }
  return 10 * pow;
}
