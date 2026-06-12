"use client";

import { useTranslation } from "react-i18next";

interface AuditDailyChartProps {
  buckets: Array<{ day: string; count: number }>;
}

const W = 800;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 26, left: 32 };

/** Per-day audit activity over the configured window. Pure SVG bars. */
export function AuditDailyChart({ buckets }: AuditDailyChartProps) {
  const { t } = useTranslation();

  if (buckets.length === 0) {
    return (
      <p className="text-neutral-soft text-sm">
        {t("admin.systemOverview.audit.emptyChart")}
      </p>
    );
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const niceMax = niceCeil(max);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const barGap = 2;
  const barW = Math.max(2, innerW / buckets.length - barGap);

  // Tick every ~5 days so the x-axis stays readable.
  const tickEvery = buckets.length > 20 ? 5 : buckets.length > 10 ? 3 : 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-[200px] w-full"
      role="img"
      aria-label={t("admin.systemOverview.audit.dailyTitle")}
    >
      {/* Y grid lines */}
      {[0, 0.5, 1].map((p) => {
        const y = PAD.top + innerH * (1 - p);
        return (
          <g key={p}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray={p === 0 ? "0" : "3 3"}
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#9CA3AF"
            >
              {Math.round(niceMax * p)}
            </text>
          </g>
        );
      })}

      {buckets.map((b, i) => {
        const h = (b.count / niceMax) * innerH;
        const x = PAD.left + i * (barW + barGap);
        const y = PAD.top + innerH - h;
        return (
          <g key={b.day}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              fill="#1F8505"
              opacity={b.count === 0 ? 0.18 : 0.85}
            >
              <title>{`${b.day}: ${b.count}`}</title>
            </rect>
            {i % tickEvery === 0 && (
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#9CA3AF"
              >
                {b.day.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function niceCeil(n: number): number {
  if (n <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  for (const s of [1, 2, 2.5, 5, 10]) {
    const cap = s * pow;
    if (n <= cap) return cap;
  }
  return 10 * pow;
}
