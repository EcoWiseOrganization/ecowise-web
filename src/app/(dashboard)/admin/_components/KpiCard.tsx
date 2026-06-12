"use client";

import { useTranslation } from "react-i18next";
import type { SvgIconComponent } from "@mui/icons-material";

interface KpiCardProps {
  /** i18n key for the metric label. */
  titleKey: string;
  /** Already-formatted display value (e.g. "1,234" or "2.4 tCO₂e"). */
  value: string | number;
  /** Optional sub-line: short context, units, or a comparison hint. */
  hintKey?: string;
  /** Pre-formatted hint value rendered next to `hintKey`. */
  hintValue?: string;
  icon: SvgIconComponent;
  /** Drives the icon tint AND a faint left-edge accent bar. */
  tone?: "brand" | "blue" | "amber" | "rose" | "violet";
}

const TONES: Record<
  NonNullable<KpiCardProps["tone"]>,
  { icon: string; bg: string; bar: string }
> = {
  brand: { icon: "#1F8505", bg: "#E8F4E2", bar: "#1F8505" },
  blue: { icon: "#1F6FEB", bg: "#E1ECFF", bar: "#1F6FEB" },
  amber: { icon: "#B45309", bg: "#FEF3C7", bar: "#F59E0B" },
  rose: { icon: "#BE123C", bg: "#FFE4E6", bar: "#E11D48" },
  violet: { icon: "#6D28D9", bg: "#EDE9FE", bar: "#7C3AED" },
};

export function KpiCard({
  titleKey,
  value,
  hintKey,
  hintValue,
  icon: Icon,
  tone = "brand",
}: KpiCardProps) {
  const { t } = useTranslation();
  const palette = TONES[tone];
  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-brand-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6">
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: palette.bar }}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-neutral-muted text-xs font-medium uppercase tracking-wide sm:text-sm sm:normal-case sm:tracking-normal">
          {t(titleKey)}
        </span>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.bg }}
        >
          <Icon sx={{ fontSize: 20, color: palette.icon }} />
        </div>
      </div>
      <span className="text-brand-700 text-2xl font-bold leading-tight sm:text-3xl">
        {value}
      </span>
      {hintKey && (
        <span className="text-neutral-muted text-xs">
          {t(hintKey)}
          {hintValue !== undefined && (
            <span className="text-brand-700 ml-1 font-semibold">{hintValue}</span>
          )}
        </span>
      )}
    </div>
  );
}
