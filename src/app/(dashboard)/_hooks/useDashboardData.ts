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
 * Default period for the individual dashboard cards: the current
 * calendar year up to today. The same period is used to compute
 * every KPI / chart on the page so the numbers stay consistent.
 * The user already has a separate, full-screen date-range picker on
 * the Reports tab when they want to drill into other windows.
 */
function currentYearWindow(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(today) };
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
}

/**
 * Single-shot loader for the individual dashboard. Pulls personal
 * stats for the current year, the latest 5 logs, and the active
 * carbon target in parallel — all KPIs / charts / lists on the page
 * derive from one of these three sources, so a single refresh
 * function is enough.
 */
export function useDashboardData(refreshKey = 0): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<EmissionLogWithCategory[]>([]);
  const [target, setTarget] = useState<CarbonTargetWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const period = currentYearWindow();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      getPersonalStatsAction(period.start, period.end),
      getPersonalLogsAction({ pageSize: 5, page: 1 }),
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
    // refreshKey & tick drive manual re-fetches; period values are
    // derived from "today" once per render and intentionally not in
    // the dep array (re-running every minute would thrash the UI).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, tick]);

  return {
    stats,
    recentLogs,
    target,
    period: { ...period, year: new Date(period.start).getFullYear() },
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
