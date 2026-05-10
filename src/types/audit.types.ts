/**
 * Audit log types (Phase 0).
 * Mirrors the "AuditLogs" table created in supabase/migrations/004_audit_logs.sql.
 */

import type { ActorRole } from "@/lib/auth/roles";

export type AuditLogStatus = "success" | "failure" | "warning";

/**
 * Resource types tracked by the generic audit_table_change trigger
 * plus app-layer actions (auth/export/etc.).
 */
export type AuditResourceType =
  | "organization"
  | "organization_member"
  | "event"
  | "emission_log"
  | "emission_factor"
  | "emission_category"
  | "calculation_template"
  | "user"
  | "auth"
  | "report"
  | "subscription"
  | "challenge"
  | "reward";

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_role: ActorRole | null;
  action: string;
  resource_type: AuditResourceType | string;
  resource_id: string | null;
  org_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: AuditLogStatus;
  error_message: string | null;
  created_at: string;
}

export interface WriteAuditLogInput {
  actorUserId?: string | null;
  actorRole?: ActorRole | null;
  action: string;
  resourceType: AuditResourceType | string;
  resourceId?: string | null;
  orgId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  status?: AuditLogStatus;
  errorMessage?: string | null;
}

export interface AuditLogFilters {
  startDate?: string;
  endDate?: string;
  actorUserId?: string;
  actorRole?: ActorRole;
  action?: string;
  resourceType?: AuditResourceType | string;
  resourceId?: string;
  orgId?: string;
  status?: AuditLogStatus;
  page?: number;
  pageSize?: number;
}
