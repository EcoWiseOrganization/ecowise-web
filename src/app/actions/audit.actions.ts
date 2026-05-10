"use server";

/**
 * Server Actions for audit log retrieval (Phase 0).
 * Writes go through `writeAuditLog` directly from the actions that originated
 * the change — there is no public write action because clients must never be
 * able to forge audit entries.
 *
 * These read actions are guarded by `requireSystemAdmin()`.
 */

import { requireSystemAdmin, AuthError } from "@/lib/auth/roles";
import { searchAuditLogs } from "@/services/audit.service";
import type { AuditLog, AuditLogFilters } from "@/types/audit.types";

export async function searchAuditLogsAction(
  filters: AuditLogFilters
): Promise<{ data: AuditLog[]; count: number; error: string | null }> {
  try {
    await requireSystemAdmin();
    const result = await searchAuditLogs(filters);
    return { data: result.data, count: result.count, error: null };
  } catch (err) {
    if (err instanceof AuthError) {
      return { data: [], count: 0, error: err.code };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: [], count: 0, error: message };
  }
}
