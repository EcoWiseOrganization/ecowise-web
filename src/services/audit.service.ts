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
