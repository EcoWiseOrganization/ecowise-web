/**
 * Pure helpers for carbon-target progress (Phase 4). Kept dependency-free for
 * unit testing.
 */

export interface ProgressInput {
  baseline: number;
  target: number;
  current: number;
  startDate: Date;
  endDate: Date;
  now?: Date;
}

export interface ProgressOutput {
  elapsedDays: number;
  totalDays: number;
  progressPct: number;
  onTrack: boolean;
}

/**
 * Returns the user's progress towards a carbon-reduction target.
 *
 *   progressPct = (baseline - current) / (baseline - target)
 *
 * Result is clamped at the lower end at -1 (way over baseline) and is allowed
 * to exceed 1 when the user has already reduced beyond their target.
 *
 * Edge cases:
 *  • baseline == target  → division by zero ⇒ 1 if current ≤ target else 0.
 *  • dates inverted      → elapsed/total = 0 / 0; treat as not-started.
 */
export function targetProgress(input: ProgressInput): ProgressOutput {
  const now = input.now ?? new Date();

  const totalMs = input.endDate.getTime() - input.startDate.getTime();
  const elapsedMs = Math.max(
    0,
    Math.min(totalMs, now.getTime() - input.startDate.getTime())
  );

  const totalDays = Math.max(0, Math.round(totalMs / 86_400_000));
  const elapsedDays = Math.max(0, Math.round(elapsedMs / 86_400_000));

  const denom = input.baseline - input.target;
  let progressPct: number;
  if (denom === 0) {
    progressPct = input.current <= input.target ? 1 : 0;
  } else {
    progressPct = (input.baseline - input.current) / denom;
  }

  // Clamp lower bound only — allow over-achievement.
  if (!Number.isFinite(progressPct)) progressPct = 0;
  if (progressPct < -1) progressPct = -1;

  return {
    elapsedDays,
    totalDays,
    progressPct,
    onTrack: input.current <= input.target,
  };
}

/**
 * Daily-spam threshold for personal log creation (BR-09 default for B2C).
 * Replaceable later by per-subscription quota.
 */
export const PERSONAL_DAILY_LOG_LIMIT = 50;

/**
 * Pure helper used to decide if a new log would exceed the daily limit.
 */
export function exceedsDailyLogLimit(
  currentCount: number,
  limit: number = PERSONAL_DAILY_LOG_LIMIT
): boolean {
  return currentCount >= limit;
}
