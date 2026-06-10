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

  // Only Verified / Published / Exported logs count toward the KPI.
  // The original query summed every row regardless of review state, so a
  // pile of Rejected drafts inflated the totalEmissionsKg the overview
  // card shows next to "Total carbon emissions". `pendingReviews` is
  // counted separately below from the Pending/Review buckets.
  const COUNTABLE_LOG_STATUSES = ["Verified", "Published", "Exported"];

  const [logs, members, events, pending] = await Promise.all([
    db
      .from("EmissionLogs")
      .select("scope, co2e_result")
      .eq("org_id", orgId)
      .in("status", COUNTABLE_LOG_STATUSES)
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

/**
 * Lightweight count of Pending/Review emission logs for the org. Used by
 * the org layout to populate the "needs review" badge in the tab bar
 * without paying for the full `getOrgMetricsSummary` rollup (4 sub-queries
 * across EmissionLogs / OrganizationMembers / Events on every navigation).
 */
export async function countPendingReviews(orgId: string): Promise<number> {
  const db = createServiceClient();
  const { count } = await db
    .from("EmissionLogs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .in("status", ["Pending", "Review"]);
  return count ?? 0;
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

/**
 * BR-09 event-creation quota. Mirrors `getInviteCapacity` but reads
 * `plan.max_events` instead of `plan.max_users` and counts current
 * Events (excluding Cancelled / Archived) for the org.
 *
 * NULL plan limit = unlimited. Free / unknown plans fall back to 0
 * events (i.e. Free can't create any) per migration 012's seeds.
 */
export async function getEventCapacity(orgId: string): Promise<InviteCapacity> {
  const db = createServiceClient();

  const { data: subRows } = await db
    .from("Subscriptions")
    .select(`plan:SubscriptionPlans(max_events)`)
    .eq("subject_type", "Org")
    .eq("subject_id", orgId)
    .in("status", ["Trial", "Active", "PastDue"])
    .order("created_at", { ascending: false })
    .limit(1);

  type SubRow = {
    plan?: { max_events: number | null } | { max_events: number | null }[] | null;
  };
  const planRaw = (subRows?.[0] as SubRow | undefined)?.plan;
  const planObj = Array.isArray(planRaw) ? planRaw[0] ?? null : planRaw ?? null;
  // No active plan = no event quota at all (Free B2C_FREE has max_events=0
  // per migration 012). Org admins must upgrade.
  const max: number | null = planObj ? planObj.max_events : 0;

  const { count } = await db
    .from("Events")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .not("status", "in", "(\"Cancelled\",\"Archived\")");
  const current = count ?? 0;

  if (max === null) {
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

/**
 * Server-side validation for org settings updates. The client form
 * (`OrgSettingsForm`) caps lengths and uses `type="email" | "url"` for
 * a hint, but a crafted server-action call can bypass both — so we
 * re-validate here. Each rule throws a typed error code the action
 * layer maps back to a translation key.
 *
 *   • Email — RFC-ish shape + max 320 chars (the RFC 5321 cap).
 *   • URL — must parse + be http/https + max 500 chars (longer URLs
 *     are typically tracking junk and break audit log readability).
 *   • Free-text fields — trimmed + per-field length cap so a long
 *     paste can't blow past UI bounds or cookie/audit budgets.
 */
const EMAIL_MAX_LEN = 320;
const URL_MAX_LEN = 500;
const LEGAL_NAME_MAX_LEN = 200;
const INDUSTRY_MAX_LEN = 100;
const ADDRESS_MAX_LEN = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateOrgEmail(raw: string): string {
  const v = raw.trim();
  if (v.length === 0) return "";
  if (v.length > EMAIL_MAX_LEN) throw new Error("EMAIL_TOO_LONG");
  if (!EMAIL_RE.test(v)) throw new Error("INVALID_EMAIL");
  return v.toLowerCase();
}

function validateHttpUrl(raw: string, field: "website" | "logo"): string {
  const v = raw.trim();
  if (v.length === 0) return "";
  if (v.length > URL_MAX_LEN) {
    throw new Error(field === "website" ? "WEBSITE_TOO_LONG" : "LOGO_URL_TOO_LONG");
  }
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(field === "website" ? "INVALID_WEBSITE" : "INVALID_LOGO_URL");
    }
  } catch {
    throw new Error(field === "website" ? "INVALID_WEBSITE" : "INVALID_LOGO_URL");
  }
  return v;
}

export async function updateOrganization(
  orgId: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  const db = createServiceClient();
  // Pre-fetch the current row so we can detect identity-affecting
  // changes (legal_name, tax_code) — these MUST reset the verification
  // status so a Verified org renaming itself cannot masquerade as a
  // pre-vetted entity to its own attendees / partners.
  const { data: currentRaw } = await db
    .from("Organization")
    .select("legal_name, verification_status")
    .eq("id", orgId)
    .maybeSingle();
  const current = currentRaw as
    | { legal_name: string | null; verification_status: string | null }
    | null;

  const patch: Record<string, unknown> = {};
  let resetVerification = false;
  if (typeof input.legal_name === "string") {
    const v = input.legal_name.trim();
    if (v.length === 0) throw new Error("LEGAL_NAME_REQUIRED");
    if (v.length > LEGAL_NAME_MAX_LEN) throw new Error("LEGAL_NAME_TOO_LONG");
    patch.legal_name = v;
    // Only reset when the name actually changes AND the org is
    // currently Verified — Pending stays Pending; Suspended stays
    // Suspended (an admin action overrides any auto-reset path).
    if (
      current?.verification_status === "Verified" &&
      (current.legal_name ?? "") !== v
    ) {
      resetVerification = true;
    }
  }
  if (typeof input.org_type === "string") patch.org_type = input.org_type;
  if (typeof input.industry === "string") {
    const v = input.industry.trim();
    if (v.length > INDUSTRY_MAX_LEN) throw new Error("INDUSTRY_TOO_LONG");
    patch.industry = v || null;
  }
  if (typeof input.website_url === "string") {
    const v = validateHttpUrl(input.website_url, "website");
    patch.website_url = v || null;
  }
  if (typeof input.address === "string") {
    const v = input.address.trim();
    if (v.length > ADDRESS_MAX_LEN) throw new Error("ADDRESS_TOO_LONG");
    patch.address = v || null;
  }
  if (typeof input.contact_email === "string") {
    const v = validateOrgEmail(input.contact_email);
    patch.contact_email = v || null;
  }
  if (typeof input.logo_url === "string") {
    const v = validateHttpUrl(input.logo_url, "logo");
    patch.logo_url = v || null;
  }

  if (Object.keys(patch).length === 0) {
    const { data } = await db
      .from("Organization")
      .select("*")
      .eq("id", orgId)
      .single();
    return data as Organization;
  }

  if (resetVerification) {
    patch.verification_status = "Pending";
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
