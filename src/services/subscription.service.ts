/**
 * Server-only subscription / billing service (Phase 7).
 * Mock payment provider — all real-gateway calls are stubbed; the checkout
 * page surfaces a "Confirm payment" button which calls /api/payments/mock.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildMockQrPayload,
  generateInvoiceNumber,
  paymentIntentExpiry,
  periodEnd,
} from "@/lib/billing";
import type {
  BillingInfoInput,
  Invoice,
  InvoiceLineItem,
  PaymentIntent,
  Subscription,
  SubscriptionPlan,
  SubscriptionSubjectType,
  SubscriptionUsage,
  SubscriptionWithPlan,
  UpsertSubscriptionPlanInput,
} from "@/types/subscription.types";

// ── Plans ─────────────────────────────────────────────────────────────────

export async function listPlans(target?: "B2B" | "B2C"): Promise<SubscriptionPlan[]> {
  const db = createServiceClient();
  let q = db
    .from("SubscriptionPlans")
    .select("*")
    .order("base_price_usd", { ascending: true });
  if (target) q = q.eq("target_customer", target);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionPlan[];
}

export async function getPlan(id: string): Promise<SubscriptionPlan | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("SubscriptionPlans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as SubscriptionPlan) ?? null;
}

export async function createPlan(
  input: UpsertSubscriptionPlanInput,
  userId: string
): Promise<SubscriptionPlan> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("SubscriptionPlans")
    .insert({
      plan_code: input.plan_code.trim(),
      plan_name: input.plan_name.trim(),
      target_customer: input.target_customer,
      base_price_usd: input.base_price_usd,
      billing_cycle: input.billing_cycle,
      trial_days: input.trial_days ?? 0,
      max_users: input.max_users ?? null,
      max_events: input.max_events ?? null,
      features: input.features ?? [],
      status: input.status ?? "Active",
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SubscriptionPlan;
}

export async function updatePlan(
  id: string,
  input: Partial<UpsertSubscriptionPlanInput>
): Promise<SubscriptionPlan> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("SubscriptionPlans")
    .update({
      plan_name: input.plan_name,
      target_customer: input.target_customer,
      base_price_usd: input.base_price_usd,
      billing_cycle: input.billing_cycle,
      trial_days: input.trial_days,
      max_users: input.max_users,
      max_events: input.max_events,
      features: input.features,
      status: input.status,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SubscriptionPlan;
}

export async function archivePlan(id: string): Promise<void> {
  const db = createServiceClient();
  await db.from("SubscriptionPlans").update({ status: "Inactive" }).eq("id", id);
}

// ── Subscriptions ─────────────────────────────────────────────────────────

export async function getCurrentSubscription(
  subjectType: SubscriptionSubjectType,
  subjectId: string
): Promise<SubscriptionWithPlan | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("Subscriptions")
    .select(`*, plan:SubscriptionPlans(*)`)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .in("status", ["Trial", "Active", "PastDue"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as SubscriptionWithPlan) ?? null;
}

export async function getSubscriptionById(
  id: string
): Promise<SubscriptionWithPlan | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("Subscriptions")
    .select(`*, plan:SubscriptionPlans(*)`)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as SubscriptionWithPlan) ?? null;
}

export async function getOrgUsage(orgId: string): Promise<SubscriptionUsage> {
  const db = createServiceClient();
  const [{ count: usersCount }, { count: eventsCount }, sub] = await Promise.all([
    db
      .from("OrganizationMembers")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "Active"),
    db.from("Events").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    getCurrentSubscription("Org", orgId),
  ]);
  return {
    activeUsers: usersCount ?? 0,
    totalEvents: eventsCount ?? 0,
    maxUsers: sub?.plan.max_users ?? null,
    maxEvents: sub?.plan.max_events ?? null,
  };
}

// ── Subscribe / upgrade flow (mock) ───────────────────────────────────────

export interface SubscribeResult {
  subscription: Subscription;
  invoice: Invoice;
  intent: PaymentIntent | null;
}

export async function subscribeToPlan(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  planId: string;
  userId: string;
  billing?: BillingInfoInput;
}): Promise<SubscribeResult> {
  const db = createServiceClient();
  const plan = await getPlan(opts.planId);
  if (!plan) throw new Error("PLAN_NOT_FOUND");

  const start = new Date();
  const end = periodEnd(start, plan.billing_cycle);
  const inTrial = plan.trial_days > 0;
  const trialEnd = inTrial
    ? new Date(start.getTime() + plan.trial_days * 86_400_000)
    : null;

  // Insert the NEW subscription first. The previous version cancelled
  // the old sub before inserting — if the insert then failed (DB hiccup,
  // plan archived, etc.) the user was left with NO active subscription
  // and a partial state to recover by hand.
  //
  // By inserting first we briefly have two active subs in the worst
  // case, which the cron / RLS / billing UI all tolerate. We then cancel
  // the previous one; failure to cancel is logged + flagged for cleanup
  // but never bubbles up as a failed checkout.
  const { data: subRow, error: subErr } = await db
    .from("Subscriptions")
    .insert({
      subject_type: opts.subjectType,
      subject_id: opts.subjectId,
      plan_id: opts.planId,
      status: inTrial ? "Trial" : plan.base_price_usd === 0 ? "Active" : "PastDue",
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
      trial_end: trialEnd ? trialEnd.toISOString() : null,
      auto_renew: true,
      billing_email: opts.billing?.billing_email ?? null,
      billing_company_name: opts.billing?.billing_company_name ?? null,
      billing_address: opts.billing?.billing_address ?? null,
      billing_vat_id: opts.billing?.billing_vat_id ?? null,
      created_by: opts.userId,
    })
    .select()
    .single();
  if (subErr) throw new Error(subErr.message);
  const subscription = subRow as Subscription;

  // Now retire any prior active/trial sub. We exclude the row we just
  // inserted from the predicate so a transient read of our own row
  // doesn't get clobbered.
  const { error: cancelErr } = await db
    .from("Subscriptions")
    .update({ status: "Canceled", canceled_at: new Date().toISOString() })
    .eq("subject_type", opts.subjectType)
    .eq("subject_id", opts.subjectId)
    .neq("id", subscription.id)
    .in("status", ["Trial", "Active", "PastDue"]);
  if (cancelErr) {
    // Don't roll back the new sub — the user has a valid subscription
    // either way. Log so ops can sweep the duplicate.
    console.error(
      "[subscription.subscribeToPlan] failed to cancel prior subscription",
      {
        subjectType: opts.subjectType,
        subjectId: opts.subjectId,
        newSubId: subscription.id,
        error: cancelErr.message,
      },
    );
  }

  // Free plan → no invoice, immediately Active.
  if (plan.base_price_usd === 0) {
    return {
      subscription,
      invoice: await createFreeReceipt(subscription, plan, opts.userId),
      intent: null,
    };
  }

  // Paid plan → create invoice + payment intent.
  const lineItems: InvoiceLineItem[] = [
    {
      description: `${plan.plan_name} (${plan.billing_cycle})`,
      quantity: 1,
      unit_price: Number(plan.base_price_usd),
      amount: Number(plan.base_price_usd),
    },
  ];

  const invoiceNumber = generateInvoiceNumber();
  const { data: invRow, error: invErr } = await db
    .from("Invoices")
    .insert({
      subscription_id: subscription.id,
      invoice_number: invoiceNumber,
      subject_type: opts.subjectType,
      subject_id: opts.subjectId,
      billing_reason: inTrial ? "trial_signup" : "new_subscription",
      amount: Number(plan.base_price_usd),
      currency: "USD",
      status: inTrial ? "Paid" : "PendingPayment",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: end.toISOString().slice(0, 10),
      line_items: lineItems,
      created_by: opts.userId,
    })
    .select()
    .single();
  if (invErr) throw new Error(invErr.message);
  const invoice = invRow as Invoice;

  if (inTrial) {
    return { subscription, invoice, intent: null };
  }

  const expires = paymentIntentExpiry();
  const { data: intentRow, error: intentErr } = await db
    .from("PaymentIntents")
    .insert({
      invoice_id: invoice.id,
      provider: "mock",
      qr_payload: buildMockQrPayload({
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
      }),
      amount: invoice.amount,
      currency: invoice.currency,
      status: "Pending",
      expires_at: expires.toISOString(),
    })
    .select()
    .single();
  if (intentErr) throw new Error(intentErr.message);

  return { subscription, invoice, intent: intentRow as PaymentIntent };
}

async function createFreeReceipt(
  sub: Subscription,
  plan: SubscriptionPlan,
  userId: string
): Promise<Invoice> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Invoices")
    .insert({
      subscription_id: sub.id,
      invoice_number: generateInvoiceNumber(),
      subject_type: sub.subject_type,
      subject_id: sub.subject_id,
      billing_reason: "free_plan",
      amount: 0,
      currency: "USD",
      status: "Paid",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      paid_at: new Date().toISOString(),
      line_items: [
        {
          description: `${plan.plan_name} (Free)`,
          quantity: 1,
          unit_price: 0,
          amount: 0,
        },
      ],
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Invoice;
}

// ── Confirm mock payment ──────────────────────────────────────────────────

/**
 * Identifies who's allowed to confirm a given payment intent. For B2C
 * the caller MUST be the invoice subject's user id. For B2B the caller
 * must be an Active Org Admin of the invoice subject's org. Passing
 * `null` lets the caller scope themselves implicitly (service-role /
 * cron); production callers should always pass a context.
 */
export interface ConfirmCallerContext {
  userId: string;
  /** Comma-list of org_ids where the caller is an Active Org Admin. Used
   *  to authorise B2B invoice confirmations. */
  adminOrgIds: string[];
}

export async function confirmMockPayment(
  intentId: string,
  caller?: ConfirmCallerContext,
): Promise<{
  intent: PaymentIntent;
  invoice: Invoice;
  subscription: Subscription | null;
}> {
  const db = createServiceClient();

  const { data: intent, error: e1 } = await db
    .from("PaymentIntents")
    .select("*")
    .eq("id", intentId)
    .single();
  if (e1 || !intent) throw new Error("INTENT_NOT_FOUND");

  // AUTHORISATION: anyone with `intentId` can hit this endpoint, so we
  // MUST verify the caller is entitled to flip this specific invoice to
  // Paid. Without this check, any signed-in user who guessed/leaked an
  // intentId could activate someone else's plan for free. Load the
  // invoice first to find subject_type/subject_id.
  if (caller) {
    const invoiceForCheck = await getInvoice(intent.invoice_id);
    if (!invoiceForCheck) throw new Error("INTENT_NOT_FOUND");

    if (invoiceForCheck.subject_type === "User") {
      if (invoiceForCheck.subject_id !== caller.userId) {
        throw new Error("FORBIDDEN");
      }
    } else if (invoiceForCheck.subject_type === "Org") {
      if (!caller.adminOrgIds.includes(invoiceForCheck.subject_id)) {
        throw new Error("FORBIDDEN");
      }
    } else {
      // Unknown subject_type — fail closed.
      throw new Error("FORBIDDEN");
    }
  }

  if (intent.status === "Paid") {
    // Already paid — return current snapshot
    const inv = await getInvoice(intent.invoice_id);
    return { intent: intent as PaymentIntent, invoice: inv!, subscription: null };
  }
  if (intent.status === "Expired" || new Date(intent.expires_at) < new Date()) {
    await db
      .from("PaymentIntents")
      .update({ status: "Expired" })
      .eq("id", intentId);
    throw new Error("INTENT_EXPIRED");
  }

  // Mark intent + invoice paid, activate subscription.
  const now = new Date().toISOString();
  await db
    .from("PaymentIntents")
    .update({ status: "Paid", paid_at: now, provider_payload: { mock: true } })
    .eq("id", intentId);

  const { data: invRow } = await db
    .from("Invoices")
    .update({ status: "Paid", paid_at: now })
    .eq("id", intent.invoice_id)
    .select()
    .single();

  let sub: Subscription | null = null;
  if (invRow?.subscription_id) {
    const { data: subRow } = await db
      .from("Subscriptions")
      .update({ status: "Active", retry_count: 0 })
      .eq("id", invRow.subscription_id)
      .select()
      .single();
    sub = (subRow as Subscription) ?? null;
  }

  const refreshedIntent = await db
    .from("PaymentIntents")
    .select("*")
    .eq("id", intentId)
    .single();

  return {
    intent: refreshedIntent.data as PaymentIntent,
    invoice: invRow as Invoice,
    subscription: sub,
  };
}

// ── Invoice queries ───────────────────────────────────────────────────────

export async function getInvoice(id: string): Promise<Invoice | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("Invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Invoice) ?? null;
}

export async function listInvoices(
  subjectType: SubscriptionSubjectType,
  subjectId: string
): Promise<Invoice[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Invoices")
    .select("*")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export async function getActiveIntentForInvoice(
  invoiceId: string
): Promise<PaymentIntent | null> {
  const db = createServiceClient();
  const { data } = await db
    .from("PaymentIntents")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PaymentIntent) ?? null;
}

// ── Billing info update ───────────────────────────────────────────────────

export async function updateBillingInfo(
  subscriptionId: string,
  input: BillingInfoInput
): Promise<Subscription> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("Subscriptions")
    .update({
      billing_email: input.billing_email,
      billing_company_name: input.billing_company_name,
      billing_address: input.billing_address,
      billing_vat_id: input.billing_vat_id,
    })
    .eq("id", subscriptionId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Subscription;
}

// ── Cancel subscription ───────────────────────────────────────────────────

export async function cancelSubscription(
  id: string,
  reason?: string,
  feedback?: string
): Promise<void> {
  const db = createServiceClient();
  // BR-11 — keep premium until period_end; just turn auto_renew off.
  const { error } = await db
    .from("Subscriptions")
    .update({
      auto_renew: false,
      canceled_at: new Date().toISOString(),
      cancel_reason: reason ?? null,
      cancel_feedback: feedback ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Re-enable auto-renew (only valid while period_end is still in the future). */
export async function reactivateAutoRenew(id: string): Promise<void> {
  const db = createServiceClient();
  const { error } = await db
    .from("Subscriptions")
    .update({
      auto_renew: true,
      canceled_at: null,
      cancel_reason: null,
      cancel_feedback: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
