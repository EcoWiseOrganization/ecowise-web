"use server";

/**
 * Server actions for personal carbon tracking (Phase 4): UC-12, UC-13, UC-14,
 * UC-15, UC-16, UC-19. All actions require an authenticated session and
 * mutate only the caller's data.
 */

import { revalidatePath } from "next/cache";
import { requireSession, AuthError } from "@/lib/auth/roles";
import { MSG } from "@/lib/messages";
import {
  createPersonalLog,
  deletePersonalLog,
  getPersonalLogs,
  getPersonalStats,
  getTodayLogCount,
  PERSONAL_DAILY_LOG_LIMIT,
  updatePersonalLog,
} from "@/services/personal-log.service";
import {
  archiveTarget,
  createPersonalTarget,
  getActiveTargetWithProgress,
  getPersonalPeriodTotal,
  listMyTargets,
} from "@/services/targets.service";
import { buildRecommendations, type Recommendation } from "@/lib/recommendations";
import type {
  CreateEmissionLogInput,
  EmissionLog,
  EmissionLogFilters,
  EmissionLogWithCategory,
} from "@/types/emission-log.types";
import type {
  CarbonTarget,
  CarbonTargetWithProgress,
  CreateCarbonTargetInput,
} from "@/types/target.types";

// ── Activity Logger (UC-12) + History (UC-16) ────────────────────────────

export async function createPersonalLogAction(
  input: Omit<CreateEmissionLogInput, "org_id">
): Promise<{ data: EmissionLog | null; error: string | null }> {
  try {
    const ctx = await requireSession();
    if (
      !input.activity_name?.trim() ||
      !input.scope ||
      !input.reporting_date ||
      !input.unit?.trim() ||
      typeof input.quantity !== "number"
    ) {
      return { data: null, error: MSG.REQUIRED_FIELD };
    }
    if (input.quantity <= 0) {
      return { data: null, error: MSG.INVALID_FORMAT };
    }
    const data = await createPersonalLog(ctx.userId, input);
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/reports");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    if (err instanceof Error && err.message === "MSG30") {
      return { data: null, error: MSG.ANTI_SPAM_LIMIT };
    }
    return {
      data: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function getPersonalLogsAction(
  filters: EmissionLogFilters
): Promise<{
  data: EmissionLogWithCategory[];
  count: number;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const result = await getPersonalLogs(ctx.userId, filters);
    return { ...result, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], count: 0, error: err.code };
    return {
      data: [],
      count: 0,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function updatePersonalLogAction(
  logId: string,
  patch: Partial<CreateEmissionLogInput>
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSession();
    await updatePersonalLog(ctx.userId, logId, patch);
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/reports");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function deletePersonalLogAction(
  logId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSession();
    await deletePersonalLog(ctx.userId, logId);
    revalidatePath("/dashboard/activity");
    revalidatePath("/dashboard/reports");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return {
      ok: false,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function getDailyLogQuotaAction(): Promise<{
  used: number;
  limit: number;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const used = await getTodayLogCount(ctx.userId);
    return { used, limit: PERSONAL_DAILY_LOG_LIMIT, error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { used: 0, limit: PERSONAL_DAILY_LOG_LIMIT, error: err.code };
    }
    return {
      used: 0,
      limit: PERSONAL_DAILY_LOG_LIMIT,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Personal Report (UC-13) ───────────────────────────────────────────────

export async function getPersonalStatsAction(
  startDate: string,
  endDate: string
): Promise<{
  data: Awaited<ReturnType<typeof getPersonalStats>> | null;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const data = await getPersonalStats(ctx.userId, startDate, endDate);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Targets (UC-15) ───────────────────────────────────────────────────────

export async function createMyTargetAction(
  input: CreateCarbonTargetInput
): Promise<{ data: CarbonTarget | null; error: string | null }> {
  try {
    const ctx = await requireSession();
    if (!input.name?.trim() || !input.start_date || !input.end_date) {
      return { data: null, error: MSG.REQUIRED_FIELD };
    }
    if (new Date(input.end_date) <= new Date(input.start_date)) {
      return { data: null, error: MSG.DATE_RANGE };
    }
    const data = await createPersonalTarget(ctx.userId, input);
    revalidatePath("/dashboard/targets");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    if (err instanceof Error && err.message === "INVALID_TARGET_GTE_BASELINE") {
      return { data: null, error: "INVALID_TARGET_GTE_BASELINE" };
    }
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function listMyTargetsAction(): Promise<{
  data: CarbonTarget[];
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const data = await listMyTargets(ctx.userId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getActiveTargetAction(): Promise<{
  data: CarbonTargetWithProgress | null;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const data = await getActiveTargetWithProgress(ctx.userId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function archiveTargetAction(id: string): Promise<{
  ok: boolean;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    await archiveTarget(ctx.userId, id);
    revalidatePath("/dashboard/targets");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Recommendations (UC-14) ───────────────────────────────────────────────

export async function getRecommendationsAction(): Promise<{
  data: Recommendation[];
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    // Use last 90 days for category share.
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90);
    const stats = await getPersonalStats(
      ctx.userId,
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10)
    );
    const data = buildRecommendations(stats.byCategory);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Compare (UC-19) ───────────────────────────────────────────────────────

export interface ComparePeriodsInput {
  aStart: string;
  aEnd: string;
  bStart: string;
  bEnd: string;
}

export async function comparePeriodsAction(input: ComparePeriodsInput): Promise<{
  data: {
    a: { total: number; logCount: number; start: string; end: string };
    b: { total: number; logCount: number; start: string; end: string };
    deltaKg: number;
    deltaPct: number;
  } | null;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();
    const [a, b] = await Promise.all([
      getPersonalPeriodTotal(ctx.userId, input.aStart, input.aEnd),
      getPersonalPeriodTotal(ctx.userId, input.bStart, input.bEnd),
    ]);
    const delta = b.total - a.total;
    const deltaPct = a.total === 0 ? 0 : (delta / a.total) * 100;
    return {
      data: {
        a: { ...a, start: input.aStart, end: input.aEnd },
        b: { ...b, start: input.bStart, end: input.bEnd },
        deltaKg: delta,
        deltaPct,
      },
      error: null,
    };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}
