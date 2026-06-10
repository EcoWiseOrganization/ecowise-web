"use server";

/**
 * Server actions for personal carbon tracking (Phase 4): UC-12, UC-13, UC-14,
 * UC-15, UC-16, UC-19. All actions require an authenticated session and
 * mutate only the caller's data.
 */

import { revalidatePath } from "next/cache";
import { requireSession, AuthError } from "@/lib/auth/roles";
import { writeAuditLog } from "@/services/audit.service";
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
    // BR-16: every mutation against an emission log writes an audit
    // entry. SRS UC-16 explicitly requires audit on delete; the create
    // + update paths follow the same standard for symmetry.
    await writeAuditLog({
      action: "personal_log_created",
      resourceType: "emission_log",
      resourceId: data.id,
      actorUserId: ctx.userId,
      newValue: {
        activity_name: data.activity_name,
        scope: data.scope,
        reporting_date: data.reporting_date,
        quantity: data.quantity,
        unit: data.unit,
        co2e_result: data.co2e_result,
      },
    });
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
    await writeAuditLog({
      action: "personal_log_updated",
      resourceType: "emission_log",
      resourceId: logId,
      actorUserId: ctx.userId,
      newValue: patch as Record<string, unknown>,
    });
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
    // SRS UC-16 explicit: delete on personal log MUST be audited.
    await writeAuditLog({
      action: "personal_log_deleted",
      resourceType: "emission_log",
      resourceId: logId,
      actorUserId: ctx.userId,
    });
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
    const start = new Date(input.start_date);
    const end = new Date(input.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { data: null, error: MSG.INVALID_FORMAT };
    }
    if (end <= start) {
      return { data: null, error: MSG.DATE_RANGE };
    }
    // A target whose `end_date` already lies in the past is unmeetable
    // by construction — the user can't change historical emissions. We
    // accept "today" but reject any earlier date. Using midnight UTC of
    // today as the floor so a near-midnight user in VN doesn't get
    // blocked from picking the current calendar day.
    const todayFloor = new Date();
    todayFloor.setUTCHours(0, 0, 0, 0);
    if (end < todayFloor) {
      return { data: null, error: "TARGET_END_DATE_IN_PAST" };
    }
    // Cap the active window at 10 years — anything longer is almost
    // certainly a typo (e.g. 2032 instead of 2026) and silently
    // accepting it would let bad input poison the progress UI for
    // years.
    const MAX_WINDOW_MS = 10 * 365 * 86_400_000;
    if (end.getTime() - start.getTime() > MAX_WINDOW_MS) {
      return { data: null, error: "TARGET_WINDOW_TOO_LONG" };
    }
    // Baseline / target must be non-negative; target should not
    // exceed baseline (otherwise the target row describes growth, not
    // reduction — UC-15 is explicitly about reduction goals).
    if (!Number.isFinite(input.baseline_co2e) || input.baseline_co2e < 0) {
      return { data: null, error: MSG.INVALID_FORMAT };
    }
    if (!Number.isFinite(input.target_co2e) || input.target_co2e < 0) {
      return { data: null, error: MSG.INVALID_FORMAT };
    }
    if (input.target_co2e > input.baseline_co2e) {
      return { data: null, error: "INVALID_TARGET_GTE_BASELINE" };
    }
    const data = await createPersonalTarget(ctx.userId, input);
    await writeAuditLog({
      action: "carbon_target_created",
      resourceType: "carbon_target",
      resourceId: data.id,
      actorUserId: ctx.userId,
      newValue: {
        name: data.name,
        baseline_co2e: data.baseline_co2e,
        target_co2e: data.target_co2e,
        start_date: data.start_date,
        end_date: data.end_date,
      },
    });
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
    await writeAuditLog({
      action: "carbon_target_archived",
      resourceType: "carbon_target",
      resourceId: id,
      actorUserId: ctx.userId,
    });
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

    // Per seed plans (migration 012) the `recommendations` feature is on
    // B2C_PLUS only. Free users get the empty state, never recommendations.
    // Enforced server-side so a crafted action call can't bypass the gate.
    const { userHasFeature } = await import("@/lib/features");
    if (!(await userHasFeature(ctx.userId, "recommendations"))) {
      return { data: [], error: "PLAN_FEATURE_REQUIRED" };
    }

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
