/**
 * Server-only personal carbon log helpers (Phase 4).
 * Personal logs are EmissionLogs rows with org_id = NULL and
 * created_by = the calling user.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  exceedsDailyLogLimit,
  PERSONAL_DAILY_LOG_LIMIT,
} from "@/lib/targets";
import type {
  CreateEmissionLogInput,
  EmissionLog,
  EmissionLogFilters,
  EmissionLogWithCategory,
} from "@/types/emission-log.types";

// ── BR-09 daily counter helpers ───────────────────────────────────────────

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Read current count for today. Returns 0 when no row exists. */
export async function getTodayLogCount(userId: string): Promise<number> {
  const db = createServiceClient();
  const { data } = await db
    .from("DailyLogCounters")
    .select("count")
    .eq("user_id", userId)
    .eq("log_date", todayDateStr())
    .maybeSingle();
  return Number((data as { count: number } | null)?.count ?? 0);
}

/**
 * Atomically increment today's counter via upsert. Returns the new count.
 * NOTE: Postgres upsert with `count + 1` is not atomic out of the box — for
 * MVP we accept the race window (very low likelihood under per-user load).
 */
async function incrementTodayLogCount(userId: string): Promise<number> {
  const db = createServiceClient();
  const date = todayDateStr();
  const current = await getTodayLogCount(userId);
  const next = current + 1;
  await db
    .from("DailyLogCounters")
    .upsert({ user_id: userId, log_date: date, count: next }, {
      onConflict: "user_id,log_date",
    });
  return next;
}

// ── Create / list / update / delete personal logs ─────────────────────────

export async function createPersonalLog(
  userId: string,
  input: Omit<CreateEmissionLogInput, "org_id">
): Promise<EmissionLog> {
  // BR-09 daily limit
  const current = await getTodayLogCount(userId);
  if (exceedsDailyLogLimit(current)) {
    const err = new Error("MSG30");
    (err as Error & { code: string }).code = "MSG30";
    throw err;
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionLogs")
    .insert({
      org_id: null,
      activity_name: input.activity_name,
      scope: input.scope,
      source_type_id: input.source_type_id ?? null,
      reporting_date: input.reporting_date,
      quantity: input.quantity,
      unit: input.unit,
      co2e_result: input.co2e_result ?? null,
      status: input.status ?? "Pending",
      evidence_url: input.evidence_url ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await incrementTodayLogCount(userId);
  return data as EmissionLog;
}

export async function getPersonalLogs(
  userId: string,
  filters: EmissionLogFilters = {}
): Promise<{ data: EmissionLogWithCategory[]; count: number }> {
  const db = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = db
    .from("EmissionLogs")
    .select(
      `*, category:EmissionCategories(id, name, scope)`,
      { count: "exact" }
    )
    .is("org_id", null)
    .eq("created_by", userId)
    .order("reporting_date", { ascending: false })
    .range(from, to);

  if (filters.scope) q = q.eq("scope", filters.scope);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.search) q = q.ilike("activity_name", `%${filters.search}%`);
  if (filters.startDate) q = q.gte("reporting_date", filters.startDate);
  if (filters.endDate) q = q.lte("reporting_date", filters.endDate);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []) as unknown as EmissionLogWithCategory[],
    count: count ?? 0,
  };
}

/** Aggregate stats for the personal report. */
export async function getPersonalStats(
  userId: string,
  startDate: string,
  endDate: string
) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionLogs")
    .select(
      "scope, co2e_result, source_type_id, EmissionCategories(name, scope)"
    )
    .is("org_id", null)
    .eq("created_by", userId)
    .gte("reporting_date", startDate)
    .lte("reporting_date", endDate);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Array<{
    scope: string;
    co2e_result: number | null;
    EmissionCategories:
      | { name: string; scope: string }
      | { name: string; scope: string }[]
      | null;
  }>;

  const total = rows.reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);
  const byScope = { "Scope 1": 0, "Scope 2": 0, "Scope 3": 0 } as Record<
    string,
    number
  >;
  const byCategory = new Map<string, number>();

  for (const r of rows) {
    const co2 = Number(r.co2e_result) || 0;
    byScope[r.scope] = (byScope[r.scope] ?? 0) + co2;
    const catObj = Array.isArray(r.EmissionCategories)
      ? r.EmissionCategories[0] ?? null
      : r.EmissionCategories;
    const cat = catObj?.name ?? "Other";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + co2);
  }

  return {
    total,
    byScope,
    byCategory: Array.from(byCategory.entries()).map(([name, co2eKg]) => ({
      name,
      co2eKg,
    })),
    logCount: rows.length,
  };
}

// ── Update / delete (BR-05 ownership + BR-07 published lock at DB level) ──

export async function updatePersonalLog(
  userId: string,
  logId: string,
  patch: Partial<CreateEmissionLogInput>
): Promise<void> {
  const db = createServiceClient();
  // Ownership check (RLS would catch it; explicit check for clearer error.)
  const { data: row } = await db
    .from("EmissionLogs")
    .select("created_by, org_id, status")
    .eq("id", logId)
    .maybeSingle();
  if (!row || row.org_id !== null || row.created_by !== userId) {
    throw new Error("FORBIDDEN");
  }
  const { error } = await db
    .from("EmissionLogs")
    .update({
      activity_name: patch.activity_name,
      scope: patch.scope,
      source_type_id: patch.source_type_id ?? null,
      reporting_date: patch.reporting_date,
      quantity: patch.quantity,
      unit: patch.unit,
      co2e_result: patch.co2e_result ?? null,
      evidence_url: patch.evidence_url ?? null,
    })
    .eq("id", logId);
  if (error) throw new Error(error.message);
}

export async function deletePersonalLog(
  userId: string,
  logId: string
): Promise<void> {
  const db = createServiceClient();
  const { data: row } = await db
    .from("EmissionLogs")
    .select("created_by, org_id")
    .eq("id", logId)
    .maybeSingle();
  if (!row || row.org_id !== null || row.created_by !== userId) {
    throw new Error("FORBIDDEN");
  }
  const { error } = await db
    .from("EmissionLogs")
    .delete()
    .eq("id", logId);
  if (error) throw new Error(error.message);
}

export { PERSONAL_DAILY_LOG_LIMIT };
