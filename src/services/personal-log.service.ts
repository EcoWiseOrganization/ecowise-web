/**
 * Server-only personal carbon log helpers (Phase 4).
 * Personal logs are EmissionLogs rows with org_id = NULL and
 * created_by = the calling user.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
// `exceedsDailyLogLimit` is no longer used here — the BR-09 check now
// lives in the `increment_daily_log_count` RPC (migration 026) so the
// limit + increment can't drift apart under concurrent load.
import { PERSONAL_DAILY_LOG_LIMIT } from "@/lib/targets";
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
 * Atomically check + increment today's counter via the
 * `increment_daily_log_count` RPC (migration 026).
 *
 * The old implementation did a read-then-upsert in two round trips, with
 * the BR-09 limit check running *before* the increment — a classic
 * TOCTOU window that let burst submissions bypass the 50/day cap.
 *
 * The RPC takes a row-level lock on `(user_id, log_date)`, evaluates the
 * limit against the locked value, and only increments when allowed.
 * Concurrent calls serialise on the lock and produce strictly monotonic
 * counts. Returns `{ allowed: false }` when the user is over quota; the
 * caller surfaces MSG30 without inserting the emission log row.
 */
async function tryIncrementTodayLogCount(
  userId: string,
): Promise<{ allowed: boolean; newCount: number }> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("increment_daily_log_count", {
    p_user_id: userId,
    p_log_date: todayDateStr(),
  });
  if (error) throw new Error(error.message);
  // PostgREST returns the SETOF row as an array — we asked for a single
  // (new_count, allowed) tuple.
  const row = Array.isArray(data) ? data[0] : data;
  const allowed = Boolean((row as { allowed?: boolean } | null)?.allowed);
  const newCount = Number((row as { new_count?: number } | null)?.new_count ?? 0);
  return { allowed, newCount };
}

// ── CO₂e integrity (anti-cheat) ──────────────────────────────────────────

/**
 * Personal-log CO₂e value is gameable: the client picks the number and the
 * green-points / leaderboard reward verified logs at a flat rate per row.
 * Without a server-side check, a malicious user could log `quantity=1
 * kWh` with `co2e_result=0.0001 kg` to claim the points without actually
 * tracking real activity, OR inflate `co2e_result` to skew the
 * leaderboard for ego-driven users.
 *
 * Two-tier validation:
 *
 *   1. If the user picked a catalogued source (`source_type_id`
 *      references an EmissionFactor), we IGNORE the client's
 *      `co2e_result` and recompute as `quantity × ef.co2e_total`. The
 *      catalog is system-managed; the client cannot tamper with the
 *      multiplier.
 *
 *   2. If the user typed a free-form source (no factor selected), the
 *      client-supplied value is accepted but capped at a sane upper
 *      bound (10,000 kgCO₂e per single row). A passenger-car driving
 *      a full year at average UK kWh emissions is ~3,200 kg — 10,000
 *      gives 3× headroom for outliers without enabling leaderboard
 *      blowouts.
 *
 * Returns the recomputed (or trusted) value the caller should persist.
 */
const PERSONAL_LOG_CO2E_MAX_KG = 10_000;

async function resolveTrustedCo2e(
  quantity: number,
  sourceTypeId: string | null | undefined,
  clientCo2e: number | null | undefined,
): Promise<number | null> {
  if (sourceTypeId) {
    const db = createServiceClient();
    const { data: ef } = await db
      .from("EmissionFactors")
      .select("co2e_total, is_active")
      .eq("id", sourceTypeId)
      .maybeSingle();
    const row = ef as { co2e_total: number | null; is_active: boolean | null } | null;
    if (!row || row.is_active === false) {
      // Unknown / archived factor — fall through to the capped client
      // path rather than failing the insert. The factor may have been
      // archived after the client picked it.
      return clampClientCo2e(clientCo2e);
    }
    const factor = Number(row.co2e_total) || 0;
    return Math.max(0, quantity * factor);
  }
  return clampClientCo2e(clientCo2e);
}

function clampClientCo2e(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(v, PERSONAL_LOG_CO2E_MAX_KG);
}

// ── Create / list / update / delete personal logs ─────────────────────────

export async function createPersonalLog(
  userId: string,
  input: Omit<CreateEmissionLogInput, "org_id">
): Promise<EmissionLog> {
  // BR-09 daily limit — increment-then-check at the DB so concurrent
  // submissions can't both pass the gate. RPC returns allowed=false
  // when over quota and DOES NOT increment in that case.
  const { allowed } = await tryIncrementTodayLogCount(userId);
  if (!allowed) {
    const err = new Error("MSG30");
    (err as Error & { code: string }).code = "MSG30";
    throw err;
  }

  const db = createServiceClient();
  // Server-recompute / clamp before insert so a tampered client payload
  // cannot inflate or zero out CO₂e for leaderboard / points gaming.
  const trustedCo2e = await resolveTrustedCo2e(
    Number(input.quantity) || 0,
    input.source_type_id ?? null,
    input.co2e_result,
  );
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
      co2e_result: trustedCo2e,
      status: input.status ?? "Pending",
      evidence_url: input.evidence_url ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) {
    // Roll back the counter so a transient insert failure doesn't
    // permanently consume one of the user's 50/day allowance. Best-effort
    // — if this fails too we accept the lost slot; throwing the original
    // error matters more.
    await db
      .from("DailyLogCounters")
      .update({ count: Math.max(0, (await getTodayLogCount(userId)) - 1) })
      .eq("user_id", userId)
      .eq("log_date", todayDateStr());
    throw new Error(error.message);
  }

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

  /**
   * Coerce whatever the DB hands us into the canonical scope string —
   * the previous version trusted `r.scope` verbatim and indexed
   * `byScope[r.scope]`. Any drift (lowercase, "scope1", numeric "1")
   * silently fell out of the totals and never showed up in reports. We
   * also count anything we can't classify into an `Unclassified`
   * bucket so the surface area is visible instead of silently zero.
   */
  function normaliseScope(
    raw: string,
  ): "Scope 1" | "Scope 2" | "Scope 3" | "Unclassified" {
    const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "");
    if (trimmed === "scope1" || trimmed === "1") return "Scope 1";
    if (trimmed === "scope2" || trimmed === "2") return "Scope 2";
    if (trimmed === "scope3" || trimmed === "3") return "Scope 3";
    return "Unclassified";
  }

  const total = rows.reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);
  const byScope: Record<
    "Scope 1" | "Scope 2" | "Scope 3" | "Unclassified",
    number
  > = {
    "Scope 1": 0,
    "Scope 2": 0,
    "Scope 3": 0,
    Unclassified: 0,
  };
  const byCategory = new Map<string, number>();
  let unclassifiedCount = 0;

  for (const r of rows) {
    const co2 = Number(r.co2e_result) || 0;
    const bucket = normaliseScope(r.scope);
    if (bucket === "Unclassified") unclassifiedCount += 1;
    byScope[bucket] += co2;
    const catObj = Array.isArray(r.EmissionCategories)
      ? r.EmissionCategories[0] ?? null
      : r.EmissionCategories;
    const cat = catObj?.name ?? "Other";
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + co2);
  }

  if (unclassifiedCount > 0) {
    console.warn(
      "[personal-log.getPersonalStats] rows had unrecognised scope value",
      { userId, count: unclassifiedCount, startDate, endDate },
    );
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
  // Mirror the create-side anti-cheat: if the patch carries a quantity
  // (or source_type_id) we recompute / clamp before persisting. When a
  // patch omits both we leave co2e_result alone — explicit nulls still
  // collapse the column.
  const willTouchCo2e =
    patch.co2e_result !== undefined ||
    patch.quantity !== undefined ||
    patch.source_type_id !== undefined;
  const nextCo2e = willTouchCo2e
    ? await resolveTrustedCo2e(
        Number(patch.quantity) || 0,
        patch.source_type_id ?? null,
        patch.co2e_result,
      )
    : undefined;
  const updatePatch: Record<string, unknown> = {
    activity_name: patch.activity_name,
    scope: patch.scope,
    source_type_id: patch.source_type_id ?? null,
    reporting_date: patch.reporting_date,
    quantity: patch.quantity,
    unit: patch.unit,
    evidence_url: patch.evidence_url ?? null,
  };
  if (willTouchCo2e) updatePatch.co2e_result = nextCo2e;
  const { error } = await db
    .from("EmissionLogs")
    .update(updatePatch)
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
