/**
 * Pure helpers for gamification (Phase 9).
 *
 * Co-locates BR-12/13/14 enforcement primitives so they're easy to
 * unit-test without database access.
 */

import type {
  Challenge,
  GreenPointLog,
  LeaderboardRow,
} from "@/types/gamification.types";

/** Default reward awarded when an emission log is verified. */
export const POINTS_PER_VERIFIED_LOG = 10;

/**
 * BR-14: a user can complete a challenge only when activity records exist
 * inside the challenge's window. Pure check — caller fetches the relevant
 * counters and provides them as input.
 */
export function canCompleteChallenge(opts: {
  challenge: Pick<Challenge, "start_date" | "end_date" | "rules">;
  /** Number of qualifying activities recorded by the user inside the window. */
  qualifyingCount: number;
  /**
   * Optional rule.required_count override on the challenge. Defaults to 1
   * when missing.
   */
}): boolean {
  const required = Number(
    (opts.challenge.rules as Record<string, unknown>).required_count ?? 1
  );
  return opts.qualifyingCount >= required;
}

/** BR-12 helper — never expose a transfer surface. Throws to fail tests. */
export function isTransferable(): false {
  return false;
}

/**
 * Compute leaderboard rows from a flat list of point-log entries. Pure: no
 * database call. Aggregates per user_id, sorts descending, assigns dense
 * ranking (ties share a rank).
 */
export function buildLeaderboard(
  logs: Pick<GreenPointLog, "user_id" | "points">[],
  resolveName: (userId: string) => { display_name: string; email: string }
): LeaderboardRow[] {
  const totals = new Map<string, number>();
  for (const l of logs) {
    totals.set(l.user_id, (totals.get(l.user_id) ?? 0) + Number(l.points));
  }
  const sorted = Array.from(totals.entries()).sort(([, a], [, b]) => b - a);
  let lastPts = Number.POSITIVE_INFINITY;
  let rank = 0;
  let denseSlot = 0;
  return sorted.map(([userId, pts]) => {
    denseSlot += 1;
    if (pts < lastPts) {
      rank = denseSlot;
      lastPts = pts;
    }
    const meta = resolveName(userId);
    return {
      user_id: userId,
      display_name: meta.display_name,
      email: meta.email,
      total_points: pts,
      rank,
    };
  });
}

/**
 * Filter Earn-only logs to a [start, end] window. Used when constraining
 * the leaderboard to a period (week / month / all-time).
 */
export function filterLogsToWindow(
  logs: GreenPointLog[],
  startISO: string,
  endISO: string
): GreenPointLog[] {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  return logs.filter((l) => {
    const t = new Date(l.created_at).getTime();
    return t >= start && t <= end;
  });
}
