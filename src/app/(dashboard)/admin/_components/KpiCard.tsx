"use client";

import { useTranslation } from "react-i18next";
import type { SvgIconComponent } from "@mui/icons-material";

interface KpiCardProps {
  /** i18n key for the metric label. */
  titleKey: string;
  /** Already-formatted display value (e.g. "1,234" or "2.4 tCO₂e"). */
  value: string | number;
  /** Short context line, always rendered so every card has the same height. */
  hintKey: string;
  /** Pre-formatted hint suffix appended after the i18n hint text. */
  hintValue?: string;
  icon: SvgIconComponent;
  /**
   * `alert` highlights the card subtly when the metric is asking for action
   * (e.g. items in the review queue). Used sparingly — at most one card per
   * row — so it actually draws the eye.
   */
  variant?: "default" | "alert";
}

/**
 * Single KPI card. Designed for a clean, low-noise grid:
 *   ─ no coloured side-bar, no per-tone palettes (those made the row look busy);
 *   ─ every card same height because `hintKey` is required;
 *   ─ subtle brand-tinted icon chip on every card;
 *   ─ `variant="alert"` swaps to an amber chip + dot ONLY when it matters.
 */
export function KpiCard({
  titleKey,
  value,
  hintKey,
  hintValue,
  icon: Icon,
  variant = "default",
}: KpiCardProps) {
  const { t } = useTranslation();
  const isAlert = variant === "alert";

  return (
    <div className="border-brand-100 hover:border-brand-200 group flex h-full flex-col justify-between gap-4 rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:shadow-[0_4px_12px_rgba(21,90,3,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-neutral-muted text-sm font-medium leading-tight">
          {t(titleKey)}
        </span>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isAlert ? "bg-amber-50" : "bg-brand-50"
          }`}
        >
          <Icon
            sx={{
              fontSize: 18,
              color: isAlert ? "#B45309" : "#1F8505",
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-brand-700 text-3xl font-bold leading-none tracking-tight">
            {value}
          </span>
          {isAlert && (
            <span className="relative flex h-2 w-2 self-end">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
          )}
        </div>
        <span className="text-neutral-soft text-xs">
          {t(hintKey)}
          {hintValue !== undefined && (
            <span
              className={`ml-1 font-semibold ${
                isAlert ? "text-amber-700" : "text-brand-700"
              }`}
            >
              {hintValue}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
