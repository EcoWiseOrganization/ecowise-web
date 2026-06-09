/**
 * Server-only org administration helpers (Phase 3): metrics, employee
 * activity rollup, invite capacity (BR-09), org profile updates,
 * emission-log review.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  EmployeeActivityRow,
  InviteCapacity,
  Organization,
  OrgMetricsSummary,
  UpdateOrganizationInput,
} from "@/types/organization.types";

// ── Metrics ───────────────────────────────────────────────────────────────

export async function getOrgMetricsSummary(
  orgId: string,
  year?: number
): Promise<OrgMetricsSummary> {
  const db = createServiceClient();

  const yearStart = year
    ? `${year}-01-01`
    : `${new Date().getFullYear()}-01-01`;
  const yearEnd = year ? `${year}-12-31` : `${new Date().getFullYear()}-12-31`;

  const [logs, members, events, pending] = await Promise.all([
    db
      .from("EmissionLogs")
      .select("scope, co2e_result")
      .eq("org_id", orgId)
      .gte("reporting_date", yearStart)
      .lte("reporting_date", yearEnd),
    db
      .from("OrganizationMembers")
      .select("status")
      .eq("org_id", orgId),
    db.from("Events").select("status").eq("org_id", orgId),
    db
      .from("EmissionLogs")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .in("status", ["Pending", "Review"]),
  ]);

  const rows = (logs.data ?? []) as { scope: string; co2e_result: number | null }[];
  const sum = (filter: (r: typeof rows[number]) => boolean) =>
    rows.filter(filter).reduce((s, r) => s + (Number(r.co2e_result) || 0), 0);

  const memberRows = (members.data ?? []) as { status: string }[];
  const eventRows = (events.data ?? []) as { status: string }[];

  return {
    totalEmissionsKg: sum(() => true),
    scope1Kg: sum((r) => r.scope === "Scope 1"),
    scope2Kg: sum((r) => r.scope === "Scope 2"),
    scope3Kg: sum((r) => r.scope === "Scope 3"),
    activeEmployees: memberRows.filter((m) => m.status === "Active").length,
    pendingMembers: memberRows.filter((m) => m.status === "Pending").length,
    activeEvents: eventRows.filter((e) => e.status === "Active").length,
    totalEvents: eventRows.length,
    pendingReviews: pending.count ?? 0,
  };
}

// ── Employee activity rollup ──────────────────────────────────────────────

export async function getEmployeeActivity(
  orgId: string
): Promise<EmployeeActivityRow[]> {
  const db = createServiceClient();
  // Pull memberships + joined User for display.
  const { data: memberships } = await db
    .from("OrganizationMembers")
    .select(
      `id, user_id, role_id, status, user:User ( id, full_name, email )`
    )
    .eq("org_id", orgId);

  const members =
    (memberships ?? []) as unknown as Array<{
      user_id: string;
      role_id: string;
      status: "Active" | "Pending" | "Inactive";
      user: { id: string; full_name: string | null; email: string } | null;
    }>;

  if (members.length === 0) return [];

  // Aggregate emission stats per user across this org.
  const { data: logs } = await db
    .from("EmissionLogs")
    .select("created_by, co2e_result, created_at")
    .eq("org_id", orgId);

  const stats = new Map<string, { total: number; co2e: number; last: string | null }>();
  for (const row of (logs ?? []) as Array<{
    created_by: string | null;
    co2e_result: number | null;
    created_at: string;
  }>) {
    if (!row.created_by) continue;
    const entry = stats.get(row.created_by) ?? { total: 0, co2e: 0, last: null };
    entry.total += 1;
    entry.co2e += Number(row.co2e_result) || 0;
    if (!entry.last || new Date(row.created_at) > new Date(entry.last)) {
      entry.last = row.created_at;
    }
    stats.set(row.created_by, entry);
  }

  return members.map((m) => ({
    user_id: m.user_id,
    full_name: m.user?.full_name ?? null,
    email: m.user?.email ?? "",
    role_id: m.role_id,
    status: m.status,
    total_logs: stats.get(m.user_id)?.total ?? 0,
    total_co2e_kg: stats.get(m.user_id)?.co2e ?? 0,
    last_activity_at: stats.get(m.user_id)?.last ?? null,
  }));
}

// ── Invite capacity (BR-09) ───────────────────────────────────────────────

/**
 * Returns the org's invite capacity. Phase 7+: prefers the active
 * subscription's `plan.max_users`; falls back to `Organization.max_users`
 * (legacy default = 50). NULL plan limit means unlimited.
 */
export async function getInviteCapacity(orgId: string): Promise<InviteCapacity> {
  const db = createServiceClient();

  // 1) Active subscription quota
  const { data: subRows } = await db
    .from("Subscriptions")
    .select(`plan:SubscriptionPlans(max_users)`)
    .eq("subject_type", "Org")
    .eq("subject_id", orgId)
    .in("status", ["Trial", "Active", "PastDue"])
    .order("created_at", { ascending: false })
    .limit(1);

  type SubRow = {
    plan?: { max_users: number | null } | { max_users: number | null }[] | null;
  };
  const planRaw = (subRows?.[0] as SubRow | undefined)?.plan;
  const planObj = Array.isArray(planRaw) ? planRaw[0] ?? null : planRaw ?? null;
  let max: number | null;
  if (planObj) {
    max = planObj.max_users; // may be null = unlimited
  } else {
    const { data: org } = await db
      .from("Organization")
      .select("max_users")
      .eq("id", orgId)
      .single();
    max = Number((org as { max_users: number | null } | null)?.max_users ?? 50);
  }

  const { count } = await db
    .from("OrganizationMembers")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "Active");
  const current = count ?? 0;

  if (max === null) {
    // Unlimited
    return {
      current,
      max: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      blocked: false,
    };
  }

  return {
    current,
    max,
    remaining: Math.max(0, max - current),
    blocked: current >= max,
  };
}

// ── Update profile (UC-26) ────────────────────────────────────────────────

export async function updateOrganization(
  orgId: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  const db = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (typeof input.legal_name === "string")
    patch.legal_name = input.legal_name.trim();
  if (typeof input.org_type === "string") patch.org_type = input.org_type;
  if (typeof input.industry === "string")
    patch.industry = input.industry.trim() || null;
  if (typeof input.website_url === "string")
    patch.website_url = input.website_url.trim() || null;
  if (typeof input.address === "string")
    patch.address = input.address.trim() || null;
  if (typeof input.contact_email === "string")
    patch.contact_email = input.contact_email.trim() || null;
  if (typeof input.logo_url === "string")
    patch.logo_url = input.logo_url.trim() || null;

  if (Object.keys(patch).length === 0) {
    const { data } = await db
      .from("Organization")
      .select("*")
      .eq("id", orgId)
      .single();
    return data as Organization;
  }

  const { data, error } = await db
    .from("Organization")
    .update(patch)
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Organization;
}

// ── Emission log review (UC-34) ───────────────────────────────────────────

export type ReviewDecision = "Verified" | "Rejected";

/**
 * Possible outcomes of an attempted review. `wrong_org` means the log
 * exists but belongs to a different tenant — surfaced as `LOG_NOT_FOUND`
 * to the caller so we never confirm cross-tenant existence; `already_*`
 * lets the caller decide whether to skip a downstream side-effect
 * (e.g. don't award points twice).
 */
export type ReviewOutcome =
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; reason: "not_found" | "wrong_org" | "locked" };

/**
 * Mark an emission log as Verified or Rejected.
 *
 * Hardened in three ways:
 *   1. `org_id` is REQUIRED and added to the WHERE clause — without it
 *      an admin of Org A who learned a log id from Org B could flip
 *      Org B's logs.
 *   2. We reject Published / Exported logs (BR-07 lock) without writing
 *      anything.
 *   3. We tell the caller whether the log was *already* in the target
 *      Verified state — used by the action layer to skip a duplicate
 *      `awardPointsForVerifiedLog` call (which would double-credit the
 *      log owner with green points on every re-review click).
 */
export async function reviewEmissionLog(
  logId: string,
  orgId: string,
  decision: ReviewDecision,
  reviewerUserId: string,
  reason?: string | null,
): Promise<ReviewOutcome> {
  const db = createServiceClient();

  // Load by id first so we can disambiguate not-found vs wrong-org vs
  // already-locked, and so we don't write when nothing should happen.
  const { data: existing } = await db
    .from("EmissionLogs")
    .select("id, org_id, status")
    .eq("id", logId)
    .maybeSingle();

  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.org_id !== orgId) return { ok: false, reason: "wrong_org" };
  if (existing.status === "Published" || existing.status === "Exported") {
    return { ok: false, reason: "locked" };
  }

  const alreadyVerified =
    existing.status === "Verified" && decision === "Verified";

  const { error } = await db
    .from("EmissionLogs")
    .update({
      status: decision,
      reviewed_by: reviewerUserId,
      reviewed_at: new Date().toISOString(),
      review_reason: reason ?? null,
    })
    .eq("id", logId)
    .eq("org_id", orgId);
  if (error) throw new Error(error.message);

  return { ok: true, alreadyVerified };
}

export async function getPendingEmissionLogs(orgId: string) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("EmissionLogs")
    .select(
      `id, activity_name, scope, reporting_date, quantity, unit, co2e_result, status, evidence_url, created_by, created_at,
       category:EmissionCategories(id, name)`
    )
    .eq("org_id", orgId)
    .in("status", ["Pending", "Review"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
