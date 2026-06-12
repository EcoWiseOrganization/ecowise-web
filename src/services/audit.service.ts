/**
 * audit.service.ts (Phase 0)
 *
 * Server-only service for writing and querying immutable audit log entries
 * (BR-16). All writes go through the service-role Supabase client to bypass
 * RLS — but the DB-level immutability triggers still reject any UPDATE /
 * DELETE / TRUNCATE attempt, so the audit trail stays append-only.
 *
 * Use the convenience helper `writeAuditLog` from server actions / route
 * handlers. Reads are restricted to System Admin via `searchAuditLogs`.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AuditLog,
  AuditLogFilters,
  WriteAuditLogInput,
} from "@/types/audit.types";

// ── Write ─────────────────────────────────────────────────────────────────

/**
 * Insert a new audit log row. Never throws to the caller — audit failures
 * are logged to the server console so they cannot break business flows.
 *
 * Returns the inserted row's id on success, or `null` on failure.
 */
export async function writeAuditLog(
  input: WriteAuditLogInput
): Promise<string | null> {
  try {
    const db = createServiceClient();
    const payload = {
      actor_user_id: input.actorUserId ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      org_id: input.orgId ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      status: input.status ?? "success",
      error_message: input.errorMessage ?? null,
    };

    const { data, error } = await db
      .from("AuditLogs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[audit.service] writeAuditLog failed", {
        action: input.action,
        resource: input.resourceType,
        error: error.message,
      });
      return null;
    }
    return (data as { id: string }).id;
  } catch (err) {
    console.error("[audit.service] writeAuditLog threw", err);
    return null;
  }
}

// ── Read (System Admin only — caller must guard with requireSystemAdmin) ──

export async function searchAuditLogs(
  filters: AuditLogFilters = {}
): Promise<{ data: AuditLog[]; count: number }> {
  const db = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 25, 200);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("AuditLogs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate);
  if (filters.actorUserId) query = query.eq("actor_user_id", filters.actorUserId);
  if (filters.actorRole) query = query.eq("actor_role", filters.actorRole);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.resourceType) query = query.eq("resource_type", filters.resourceType);
  if (filters.resourceId) query = query.eq("resource_id", filters.resourceId);
  if (filters.orgId) query = query.eq("org_id", filters.orgId);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    data: (data ?? []) as unknown as AuditLog[],
    count: count ?? 0,
  };
}

// ── Convenience helpers for app-layer events ──────────────────────────────

// ── Aggregates for the Admin "System Overview" page ──────────────────────

export interface AuditOverview {
  /** Inclusive window the aggregates cover. */
  windowDays: number;
  /** Total audit rows written in the window. */
  totalAudits: number;
  /** Rows with status='failure' (highlight: needs investigation). */
  failedCount: number;
  /** Distinct non-null actor_user_id seen in the window. */
  uniqueActors: number;
  /** failure / total, rounded to 2 decimals — handy for the alert card. */
  failureRate: number;
  /** Status histogram for a small stacked bar. */
  byStatus: { success: number; failure: number; warning: number };
  /** Per-day count, oldest → newest, length === windowDays. */
  dailyBuckets: Array<{ day: string; count: number }>;
  /** Most frequent actions; useful to spot anomalies and busy endpoints. */
  topActions: Array<{ action: string; count: number }>;
  /** Audit rows grouped by actor_role (System Admin vs Org Admin vs Member etc.). */
  byActorRole: Array<{ role: string; count: number }>;
}

/**
 * Aggregate audit-log telemetry for the System Overview page. Pulls one
 * row per audit in the window, then buckets/groups in memory — the table
 * is append-only and small enough that this is faster than 5 round-trips.
 */
export async function getAuditOverview(
  windowDays: number = 30
): Promise<AuditOverview> {
  const db = createServiceClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (windowDays - 1));
  since.setUTCHours(0, 0, 0, 0);

  const { data } = await db
    .from("AuditLogs")
    .select("actor_user_id, actor_role, action, status, created_at")
    .gte("created_at", since.toISOString());

  const rows = (data ?? []) as Array<{
    actor_user_id: string | null;
    actor_role: string | null;
    action: string;
    status: "success" | "failure" | "warning";
    created_at: string;
  }>;

  const byStatus = { success: 0, failure: 0, warning: 0 };
  const actorSet = new Set<string>();
  const actionCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  // Pre-seed the day buckets so the chart always has a row per day, even
  // when nothing happened on that day.
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    dayCounts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.actor_user_id) actorSet.add(r.actor_user_id);
    actionCounts.set(r.action, (actionCounts.get(r.action) ?? 0) + 1);
    const role = r.actor_role ?? "anonymous";
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    const day = r.created_at.slice(0, 10);
    if (dayCounts.has(day)) dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const total = rows.length;
  const failureRate =
    total === 0 ? 0 : Math.round((byStatus.failure / total) * 10000) / 100;

  return {
    windowDays,
    totalAudits: total,
    failedCount: byStatus.failure,
    uniqueActors: actorSet.size,
    failureRate,
    byStatus,
    dailyBuckets: Array.from(dayCounts.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, count]) => ({ day, count })),
    topActions: Array.from(actionCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([action, count]) => ({ action, count })),
    byActorRole: Array.from(roleCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([role, count]) => ({ role, count })),
  };
}

/**
 * Convenience: log an authentication event (login, logout, password change,
 * forgot/reset, account delete). `resource_id` is the user id when known.
 */
export async function writeAuthAuditLog(params: {
  action:
    | "login"
    | "login_failed"
    | "logout"
    | "register"
    | "password_change"
    | "password_reset"
    | "account_delete";
  userId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: "success" | "failure" | "warning";
  errorMessage?: string | null;
  extra?: Record<string, unknown>;
}): Promise<string | null> {
  return writeAuditLog({
    actorUserId: params.userId ?? null,
    actorRole: params.userId ? null : "guest",
    action: params.action,
    resourceType: "auth",
    resourceId: params.userId ?? null,
    newValue: {
      email: params.email ?? null,
      ...(params.extra ?? {}),
    },
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    status: params.status ?? "success",
    errorMessage: params.errorMessage ?? null,
  });
}
