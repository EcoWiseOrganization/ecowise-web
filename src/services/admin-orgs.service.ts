/**
 * Server-only Organizations Manager service (Phase 10).
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  AdminOrganizationDetail,
  AdminOrganizationRow,
  ContactMessageRow,
} from "@/types/admin.types";

export interface OrgSearchFilters {
  search?: string;
  industry?: string;
  verification?: string;
  page?: number;
  pageSize?: number;
}

export async function searchOrganizations(filters: OrgSearchFilters = {}): Promise<{
  data: AdminOrganizationRow[];
  count: number;
}> {
  const db = createServiceClient();
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 25, 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = db
    .from("Organization")
    .select(
      "id, legal_name, tax_code, org_type, industry, contact_email, verification_status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) {
    const term = filters.search.replace(/[%_]/g, "\\$&");
    q = q.or(
      `legal_name.ilike.%${term}%,tax_code.ilike.%${term}%,contact_email.ilike.%${term}%`
    );
  }
  if (filters.industry) q = q.eq("industry", filters.industry);
  if (filters.verification) q = q.eq("verification_status", filters.verification);

  const { data, count, error } = await q;
  if (error) throw new Error(error.message);
  const baseRows = (data ?? []) as Array<
    Omit<AdminOrganizationRow, "member_count" | "active_subscription">
  >;

  if (baseRows.length === 0) return { data: [], count: count ?? 0 };

  const orgIds = baseRows.map((r) => r.id);
  const [{ data: memberRows }, { data: subRows }] = await Promise.all([
    db
      .from("OrganizationMembers")
      .select("org_id")
      .in("org_id", orgIds)
      .eq("status", "Active"),
    db
      .from("Subscriptions")
      .select(`subject_id, plan:SubscriptionPlans(plan_name)`)
      .eq("subject_type", "Org")
      .in("subject_id", orgIds)
      .in("status", ["Trial", "Active", "PastDue"]),
  ]);

  const memberCount = new Map<string, number>();
  for (const m of (memberRows ?? []) as Array<{ org_id: string }>) {
    memberCount.set(m.org_id, (memberCount.get(m.org_id) ?? 0) + 1);
  }
  const subPlan = new Map<string, string>();
  for (const s of (subRows ?? []) as Array<{
    subject_id: string;
    plan: { plan_name: string } | { plan_name: string }[] | null;
  }>) {
    const plan = Array.isArray(s.plan) ? s.plan[0] : s.plan;
    if (plan?.plan_name) subPlan.set(s.subject_id, plan.plan_name);
  }

  const rows: AdminOrganizationRow[] = baseRows.map((r) => ({
    ...r,
    member_count: memberCount.get(r.id) ?? 0,
    active_subscription: subPlan.get(r.id) ?? null,
  }));

  return { data: rows, count: count ?? 0 };
}

export async function getAdminOrgDetail(
  orgId: string
): Promise<AdminOrganizationDetail | null> {
  const db = createServiceClient();
  const { data: org } = await db
    .from("Organization")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return null;

  const [{ data: memberRows }, { data: logRows }, { data: invoiceRows }, { data: auditRows }] =
    await Promise.all([
      db
        .from("OrganizationMembers")
        .select(`user_id, role_id, status, user:User(full_name, email)`)
        .eq("org_id", orgId)
        .order("created_at", { ascending: true }),
      db
        .from("EmissionLogs")
        .select("id, activity_name, scope, co2e_result, status, reporting_date")
        .eq("org_id", orgId)
        .order("reporting_date", { ascending: false })
        .limit(10),
      db
        .from("Invoices")
        .select("id, invoice_number, amount, status, issue_date")
        .eq("subject_type", "Org")
        .eq("subject_id", orgId)
        .order("issue_date", { ascending: false })
        .limit(10),
      db
        .from("AuditLogs")
        .select("id, action, actor_user_id, status, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const { count: memberCount } = await db
    .from("OrganizationMembers")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "Active");

  const { data: subRow } = await db
    .from("Subscriptions")
    .select(`plan:SubscriptionPlans(plan_name)`)
    .eq("subject_type", "Org")
    .eq("subject_id", orgId)
    .in("status", ["Trial", "Active", "PastDue"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planRaw = (subRow as
    | { plan: { plan_name: string } | { plan_name: string }[] | null }
    | null)?.plan;
  const planObj = Array.isArray(planRaw) ? planRaw[0] : planRaw;

  // The DB CHECK constraints (migrations 001/008) restrict these columns
  // to the same value set the unions enumerate, but PostgREST still gives
  // us `string | null`. Cast through `as` to the typed unions — if a row
  // ever carries an unexpected value, downstream UI surfaces the raw
  // string anyway via the `OrgType`/`OrgVerificationStatus` fallback
  // path.
  const orgRow: AdminOrganizationRow = {
    id: orgId,
    legal_name: (org as { legal_name: string | null }).legal_name,
    tax_code: (org as { tax_code: string | null }).tax_code,
    org_type: (org as { org_type: AdminOrganizationRow["org_type"] | null }).org_type,
    industry: (org as { industry: string | null }).industry,
    contact_email: (org as { contact_email: string | null }).contact_email,
    verification_status: (
      org as { verification_status: AdminOrganizationRow["verification_status"] | null }
    ).verification_status,
    created_at: (org as { created_at: string }).created_at,
    member_count: memberCount ?? 0,
    active_subscription: planObj?.plan_name ?? null,
  };

  return {
    org: orgRow,
    members: ((memberRows ?? []) as Array<{
      user_id: string;
      role_id: string;
      status: string;
      user: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
    }>).map((m) => {
      const u = Array.isArray(m.user) ? m.user[0] : m.user;
      return {
        user_id: m.user_id,
        email: u?.email ?? "",
        full_name: u?.full_name ?? null,
        role_id: m.role_id,
        // CHECK constraint restricts to MemberStatus values; cast through.
        status: m.status as AdminOrganizationDetail["members"][number]["status"],
      };
    }),
    recentLogs:
      ((logRows ?? []) as AdminOrganizationDetail["recentLogs"]) ?? [],
    recentInvoices:
      ((invoiceRows ?? []) as AdminOrganizationDetail["recentInvoices"]) ?? [],
    recentAudits:
      ((auditRows ?? []) as AdminOrganizationDetail["recentAudits"]) ?? [],
  };
}

export async function setOrgVerificationStatus(
  orgId: string,
  status: "Pending" | "Verified" | "Suspended"
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("Organization")
    .update({ verification_status: status })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
}

// ── Contact messages ──────────────────────────────────────────────────────

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("ContactMessages")
    .select(
      "id, name, email, subject, message, status, ip_address, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessageRow[];
}

export async function setContactMessageStatus(
  id: string,
  status: ContactMessageRow["status"]
): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("ContactMessages")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
