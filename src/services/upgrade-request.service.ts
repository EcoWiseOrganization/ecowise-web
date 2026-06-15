/**
 * Server-only manual plan-upgrade service.
 *
 * Flow: a user (or Org Admin) picks a paid plan and pays by bank QR. We
 * record a `PlanUpgradeRequest` (Pending). A System Admin later confirms the
 * incoming transfer and approves it — which activates the subscription
 * out-of-band (no card gateway), writes a Paid invoice, notifies the
 * requester in-app, and emails them. Rejection sends the equivalent
 * "not approved" notification + email.
 */

import "server-only";
import { createServiceClient, setAuditActor } from "@/lib/supabase/service";
import { generateInvoiceNumber, periodEnd } from "@/lib/billing";
import {
  planUpgradeApprovedEmail,
  planUpgradeRejectedEmail,
  sendEmail,
} from "@/lib/emails";
import { createNotification } from "@/services/notification.service";
import { getCurrentSubscription, getPlan } from "@/services/subscription.service";
import type {
  InvoiceLineItem,
  PlanUpgradeRequest,
  PlanUpgradeRequestStatus,
  PlanUpgradeRequestWithDetails,
  SubscriptionPlan,
  SubscriptionSubjectType,
} from "@/types/subscription.types";

/** Canonical billing URL for emails (no trailing slash). */
function billingUrlFor(
  subjectType: SubscriptionSubjectType,
  subjectId: string
): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ??
    "http://localhost:3000";
  return subjectType === "Org"
    ? `${base}/dashboard/organization/${subjectId}/billing`
    : `${base}/dashboard/billing`;
}

/** Resolve the user we should notify + email for a request. */
async function resolveRecipient(
  userId: string
): Promise<{ email: string | null; name: string | null }> {
  const db = createServiceClient();
  const { data } = await db
    .from("User")
    .select("email, full_name, user_name")
    .eq("id", userId)
    .maybeSingle();
  const row = data as
    | { email: string | null; full_name: string | null; user_name: string | null }
    | null;
  return {
    email: row?.email ?? null,
    name: row?.full_name ?? row?.user_name ?? null,
  };
}

// ── Create / upsert a request ───────────────────────────────────────────────

export async function createUpgradeRequest(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  planId: string;
  requestedBy: string;
  transferNote?: string | null;
}): Promise<PlanUpgradeRequest> {
  const db = createServiceClient();
  await setAuditActor(db, opts.requestedBy);

  const plan = await getPlan(opts.planId);
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  if (Number(plan.base_price_usd) <= 0) throw new Error("PLAN_IS_FREE");

  const current = await getCurrentSubscription(opts.subjectType, opts.subjectId);

  // BR: at most one Pending request per subject (enforced by a partial unique
  // index). If one already exists we update it to the newly-chosen plan rather
  // than failing — the user simply changed their mind before paying.
  const { data: existing } = await db
    .from("PlanUpgradeRequests")
    .select("id")
    .eq("subject_type", opts.subjectType)
    .eq("subject_id", opts.subjectId)
    .eq("status", "Pending")
    .maybeSingle();

  const fields = {
    plan_id: plan.id,
    current_plan_id: current?.plan_id ?? null,
    amount: Number(plan.base_price_usd),
    currency: "USD",
    transfer_note: opts.transferNote ?? null,
    requested_by: opts.requestedBy,
  };

  if (existing?.id) {
    const { data, error } = await db
      .from("PlanUpgradeRequests")
      .update(fields)
      .eq("id", (existing as { id: string }).id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as PlanUpgradeRequest;
  }

  const { data, error } = await db
    .from("PlanUpgradeRequests")
    .insert({
      subject_type: opts.subjectType,
      subject_id: opts.subjectId,
      status: "Pending",
      ...fields,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PlanUpgradeRequest;
}

/** The subject's most recent request (any status) — drives the billing-page
 *  "pending approval" badge. */
export async function getLatestRequestForSubject(
  subjectType: SubscriptionSubjectType,
  subjectId: string
): Promise<PlanUpgradeRequest | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("PlanUpgradeRequests")
    .select("*")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PlanUpgradeRequest) ?? null;
}

// ── Admin queue ──────────────────────────────────────────────────────────────

export async function getUpgradeRequest(
  id: string
): Promise<PlanUpgradeRequest | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("PlanUpgradeRequests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as PlanUpgradeRequest) ?? null;
}

/** Hydrated list for the admin review screen. Defaults to Pending only. */
export async function listUpgradeRequests(
  status?: PlanUpgradeRequestStatus
): Promise<PlanUpgradeRequestWithDetails[]> {
  const db = createServiceClient();
  let q = db
    .from("PlanUpgradeRequests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as PlanUpgradeRequest[];
  if (rows.length === 0) return [];

  // Batch-resolve plans, requester identities, and org labels.
  const planIds = new Set<string>();
  const userIds = new Set<string>();
  const orgIds = new Set<string>();
  for (const r of rows) {
    planIds.add(r.plan_id);
    if (r.current_plan_id) planIds.add(r.current_plan_id);
    userIds.add(r.requested_by);
    if (r.subject_type === "User") userIds.add(r.subject_id);
    else orgIds.add(r.subject_id);
  }

  const [{ data: plans }, { data: users }, { data: orgs }] = await Promise.all([
    db.from("SubscriptionPlans").select("*").in("id", [...planIds]),
    db
      .from("User")
      .select("id, email, full_name, user_name")
      .in("id", [...userIds]),
    orgIds.size
      ? db.from("Organization").select("id, legal_name").in("id", [...orgIds])
      : Promise.resolve({ data: [] as { id: string; legal_name: string }[] }),
  ]);

  const planMap = new Map(
    ((plans ?? []) as SubscriptionPlan[]).map((p) => [p.id, p])
  );
  const userMap = new Map(
    (
      (users ?? []) as {
        id: string;
        email: string | null;
        full_name: string | null;
        user_name: string | null;
      }[]
    ).map((u) => [u.id, u])
  );
  const orgMap = new Map(
    ((orgs ?? []) as { id: string; legal_name: string }[]).map((o) => [
      o.id,
      o.legal_name,
    ])
  );

  return rows.map((r) => {
    const requester = userMap.get(r.requested_by);
    const subjectLabel =
      r.subject_type === "Org"
        ? orgMap.get(r.subject_id) ?? null
        : (() => {
            const u = userMap.get(r.subject_id);
            return u?.full_name ?? u?.user_name ?? u?.email ?? null;
          })();
    return {
      ...r,
      plan: planMap.get(r.plan_id) ?? null,
      current_plan: r.current_plan_id
        ? planMap.get(r.current_plan_id) ?? null
        : null,
      requester_email: requester?.email ?? null,
      requester_name: requester?.full_name ?? requester?.user_name ?? null,
      subject_label: subjectLabel,
    };
  });
}

export async function countPendingUpgradeRequests(): Promise<number> {
  const db = createServiceClient();
  const { count } = await db
    .from("PlanUpgradeRequests")
    .select("id", { count: "exact", head: true })
    .eq("status", "Pending");
  return count ?? 0;
}

// ── Approve ──────────────────────────────────────────────────────────────────

export async function approveUpgradeRequest(
  id: string,
  adminUserId: string
): Promise<PlanUpgradeRequest> {
  const db = createServiceClient();
  await setAuditActor(db, adminUserId);

  const req = await getUpgradeRequest(id);
  if (!req) throw new Error("REQUEST_NOT_FOUND");
  if (req.status !== "Pending") throw new Error("REQUEST_NOT_PENDING");

  const plan = await getPlan(req.plan_id);
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  // Preserve any billing info from the current subscription across the
  // cancel-then-insert performed by the atomic RPC.
  const current = await getCurrentSubscription(req.subject_type, req.subject_id);

  const start = new Date();
  const end = periodEnd(start, plan.billing_cycle);

  const { data: newSubId, error: rpcErr } = await db.rpc(
    "subscribe_to_plan_atomic",
    {
      p_subject_type: req.subject_type,
      p_subject_id: req.subject_id,
      p_plan_id: plan.id,
      p_status: "Active",
      p_period_start: start.toISOString(),
      p_period_end: end.toISOString(),
      p_trial_end: null,
      p_billing_email: current?.billing_email ?? null,
      p_billing_company: current?.billing_company_name ?? null,
      p_billing_address: current?.billing_address ?? null,
      p_billing_vat_id: current?.billing_vat_id ?? null,
      p_created_by: req.requested_by,
    }
  );
  if (rpcErr) throw new Error(rpcErr.message);
  if (!newSubId) throw new Error("ACTIVATE_FAILED");
  const subscriptionId = newSubId as string;

  // Paid invoice — receipt for the manual bank transfer.
  const lineItems: InvoiceLineItem[] = [
    {
      description: `${plan.plan_name} (${plan.billing_cycle})`,
      quantity: 1,
      unit_price: Number(plan.base_price_usd),
      amount: Number(plan.base_price_usd),
    },
  ];
  const nowIso = new Date().toISOString();
  await db.from("Invoices").insert({
    subscription_id: subscriptionId,
    invoice_number: generateInvoiceNumber(),
    subject_type: req.subject_type,
    subject_id: req.subject_id,
    billing_reason: "manual_bank_transfer",
    amount: Number(plan.base_price_usd),
    currency: req.currency,
    status: "Paid",
    issue_date: nowIso.slice(0, 10),
    due_date: null,
    paid_at: nowIso,
    line_items: lineItems,
    created_by: adminUserId,
  });

  const { data: updated, error: updErr } = await db
    .from("PlanUpgradeRequests")
    .update({
      status: "Approved",
      reviewed_by: adminUserId,
      reviewed_at: nowIso,
      resulting_subscription_id: subscriptionId,
    })
    .eq("id", id)
    .eq("status", "Pending")
    .select()
    .single();
  if (updErr) throw new Error(updErr.message);

  // Notify + email the requester. Both are best-effort — the upgrade itself
  // already succeeded above.
  const nextBilling = end.toISOString().slice(0, 10);
  await createNotification({
    userId: req.requested_by,
    type: "plan_upgrade_approved",
    data: { planName: plan.plan_name, nextBilling },
  });
  const recipient = await resolveRecipient(req.requested_by);
  if (recipient.email) {
    const tpl = planUpgradeApprovedEmail({
      planName: plan.plan_name,
      nextBilling,
      billingUrl: billingUrlFor(req.subject_type, req.subject_id),
    });
    await sendEmail({ to: recipient.email, ...tpl });
  }

  return updated as PlanUpgradeRequest;
}

// ── Reject ───────────────────────────────────────────────────────────────────

export async function rejectUpgradeRequest(
  id: string,
  adminUserId: string,
  reason?: string
): Promise<PlanUpgradeRequest> {
  const db = createServiceClient();
  await setAuditActor(db, adminUserId);

  const req = await getUpgradeRequest(id);
  if (!req) throw new Error("REQUEST_NOT_FOUND");
  if (req.status !== "Pending") throw new Error("REQUEST_NOT_PENDING");

  const plan = await getPlan(req.plan_id);
  const planName = plan?.plan_name ?? "";

  const { data: updated, error } = await db
    .from("PlanUpgradeRequests")
    .update({
      status: "Rejected",
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason ?? null,
    })
    .eq("id", id)
    .eq("status", "Pending")
    .select()
    .single();
  if (error) throw new Error(error.message);

  await createNotification({
    userId: req.requested_by,
    type: "plan_upgrade_rejected",
    data: { planName, reason: reason ?? null },
  });
  const recipient = await resolveRecipient(req.requested_by);
  if (recipient.email) {
    const tpl = planUpgradeRejectedEmail({
      planName,
      reason,
      billingUrl: billingUrlFor(req.subject_type, req.subject_id),
    });
    await sendEmail({ to: recipient.email, ...tpl });
  }

  return updated as PlanUpgradeRequest;
}
