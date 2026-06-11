"use client";

import { useEffect, useState } from "react";
import {
  getActiveTargetAction,
  getPersonalLogsAction,
  getPersonalStatsAction,
} from "@/app/actions/personal-carbon.actions";
import type { EmissionLogWithCategory } from "@/types/emission-log.types";
import type { CarbonTargetWithProgress } from "@/types/target.types";

/**
 * Format a Date as YYYY-MM-DD using its LOCAL components. We can't
 * use `toISOString()` here because that converts to UTC first — for
 * a user in Asia/Ho_Chi_Minh (UTC+7), Jan 1 local midnight maps to
 * Dec 31 of the prior year in UTC, which is what the dashboard chip
 * was showing.
 */
function fmtLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Default period for the individual dashboard cards: the current
 * calendar year up to today (local time). Used as the initial range
 * when the consumer hasn't pinned a custom range yet.
 */
export function currentYearWindow(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  return { start: fmtLocalISO(start), end: fmtLocalISO(today) };
}

export type DashboardStats = {
  total: number;
  byScope: {
    "Scope 1": number;
    "Scope 2": number;
    "Scope 3": number;
    Unclassified: number;
  };
  byCategory: { name: string; co2eKg: number }[];
  logCount: number;
};

export interface DashboardData {
  stats: DashboardStats | null;
  recentLogs: EmissionLogWithCategory[];
  target: CarbonTargetWithProgress | null;
  period: { start: string; end: string; year: number };
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Pin the dashboard window. Re-fetches everything as a side effect. */
  setRange: (start: string, end: string) => void;
}

/**
 * Single-shot loader for the individual dashboard. Pulls personal
 * stats for the chosen window, the latest 5 logs, and the active
 * carbon target in parallel — all KPIs / charts / lists on the page
 * derive from one of these three sources, so a single refresh
 * function is enough.
 *
 * Range is internal state initialised to the current calendar year;
 * exposed via `setRange` so the header chip can drive the window
 * without prop-drilling through every card.
 */
export function useDashboardData(refreshKey = 0): DashboardData {
  const initial = currentYearWindow();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<EmissionLogWithCategory[]>([]);
  const [target, setTarget] = useState<CarbonTargetWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [range, setRangeState] = useState<{ start: string; end: string }>(initial);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getPersonalStatsAction(range.start, range.end),
      // Recent-entries list stays anchored to the same window so it
      // can't reference logs outside the chip the user selected.
      getPersonalLogsAction({
        pageSize: 5,
        page: 1,
        startDate: range.start,
        endDate: range.end,
      }),
      getActiveTargetAction(),
    ])
      .then(([statsRes, logsRes, targetRes]) => {
        if (!active) return;
        if (statsRes.error) setError(statsRes.error);
        setStats(statsRes.data);
        setRecentLogs(logsRes.data);
        setTarget(targetRes.data);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "unknown");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, tick, range.start, range.end]);

  return {
    stats,
    recentLogs,
    target,
    period: { ...range, year: new Date(range.start).getFullYear() },
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
    setRange: (start, end) => {
      // Guard against the user typing only one half of the range —
      // the input fires onChange on every keystroke, and an empty
      // string would surface as "Invalid Date" in the SQL query.
      if (!start || !end) return;
      // Auto-swap when the user picks an end-before-start range so
      // the SQL .gte/.lte don't end up empty.
      if (end < start) {
        setRangeState({ start: end, end: start });
        return;
      }
      setRangeState({ start, end });
    },
  };
}
