/**
 * Pure helpers for the System Admin overview (Phase 10). I/O-free —
 * all DB calls live in services.
 */

import type { GrowthBucket } from "@/types/admin.types";

/**
 * Group raw row timestamps into monthly buckets for the last `months` months.
 * Pure: easy to unit-test.
 */
export function bucketByMonth(opts: {
  months: number;
  /** End anchor (defaults to "now"). Bucket "current" is end's month. */
  end?: Date;
  /** Each row counted as 1 in the bucket containing `created_at`. */
  rows: Array<{ created_at: string; kind: keyof GrowthBucket }>;
}): GrowthBucket[] {
  const end = opts.end ?? new Date();
  const buckets = new Map<string, GrowthBucket>();
  for (let i = opts.months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: key,
      newUsers: 0,
      newOrganizations: 0,
      newEmissionLogs: 0,
    });
  }
  for (const r of opts.rows) {
    const d = new Date(r.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (!b) continue;
    if (r.kind === "newUsers") b.newUsers += 1;
    else if (r.kind === "newOrganizations") b.newOrganizations += 1;
    else if (r.kind === "newEmissionLogs") b.newEmissionLogs += 1;
  }
  return Array.from(buckets.values());
}

/**
 * Convert raw audit_logs rows to a CSV blob suitable for download. We do this
 * in JS (not on the server) because exports stay in the user's browser.
 */
export function auditLogsToCsv(
  rows: Array<{
    created_at: string;
    actor_user_id: string | null;
    actor_role: string | null;
    action: string;
    resource_type: string;
    resource_id: string | null;
    org_id: string | null;
    status: string;
    error_message: string | null;
    ip_address: string | null;
  }>
): string {
  const header =
    "created_at,actor_user_id,actor_role,action,resource_type,resource_id,org_id,status,error_message,ip_address";
  const escape = (v: string | null) => {
    const s = v ?? "";
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows
    .map((r) =>
      [
        r.created_at,
        r.actor_user_id,
        r.actor_role,
        r.action,
        r.resource_type,
        r.resource_id,
        r.org_id,
        r.status,
        r.error_message,
        r.ip_address,
      ]
        .map((v) => escape(v))
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}\n`;
}
