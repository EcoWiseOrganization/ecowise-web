"use server";

/**
 * Subscription / billing server actions (Phase 7).
 * Plan CRUD: System Admin only.
 * Subscribe / upgrade / billing-info / cancel: Org Admin (subject=Org) or
 * Self (subject=User).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AuthError,
  requireOrgRole,
  requireSession,
  requireSystemAdmin,
} from "@/lib/auth/roles";
import { createServiceClient } from "@/lib/supabase/service";
import { ROLE_ADMIN_ID } from "@/lib/roles";
import { writeAuditLog } from "@/services/audit.service";
import {
  archivePlan as archivePlanSvc,
  cancelSubscription as cancelSubSvc,
  confirmMockPayment,
  createPlan,
  getActiveIntentForInvoice,
  getCurrentSubscription,
  getInvoice,
  getOrgUsage,
  getSubscriptionById,
  listInvoices,
  listPlans,
  reactivateAutoRenew,
  subscribeToPlan,
  updateBillingInfo,
  updatePlan,
} from "@/services/subscription.service";
import type {
  BillingInfoInput,
  Invoice,
  PaymentIntent,
  Subscription,
  SubscriptionPlan,
  SubscriptionSubjectType,
  SubscriptionUsage,
  SubscriptionWithPlan,
  UpsertSubscriptionPlanInput,
} from "@/types/subscription.types";

// ── Plan CRUD (System Admin only) ─────────────────────────────────────────

/**
 * Returns subscription plans for the billing UI. End-users get only the
 * Active catalog (current pricing tiers). System admins can opt in to
 * the full set (Active + Inactive) so they can see grandfathered
 * historical plans on the /admin/subscriptions screen. The
 * `includeInactive` toggle is admin-gated server-side — a caller
 * without the system-admin role gets the Active list regardless of the
 * flag value, so the action can't be coerced into leaking archived
 * plan metadata.
 */
export async function listPlansAction(
  target?: "B2B" | "B2C",
  opts?: { includeInactive?: boolean }
): Promise<{
  data: SubscriptionPlan[];
  error: string | null;
}> {
  try {
    await requireSession();
    let includeInactive = false;
    if (opts?.includeInactive) {
      try {
        await requireSystemAdmin();
        includeInactive = true;
      } catch {
        // Non-admin caller asked for the full catalog — silently
        // collapse to the public (Active-only) list rather than
        // throwing, so the regular billing screen still works
        // when an admin-only flag accidentally rides along.
        includeInactive = false;
      }
    }
    const data = await listPlans(target, { includeInactive });
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function createPlanAction(
  input: UpsertSubscriptionPlanInput
): Promise<{ data: SubscriptionPlan | null; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    const data = await createPlan(input, ctx.userId);
    revalidatePath("/admin/subscriptions");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function updatePlanAction(
  id: string,
  input: Partial<UpsertSubscriptionPlanInput>
): Promise<{ data: SubscriptionPlan | null; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    const data = await updatePlan(id, input, ctx.userId);
    revalidatePath("/admin/subscriptions");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function archivePlanAction(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSystemAdmin();
    await archivePlanSvc(id, ctx.userId);
    revalidatePath("/admin/subscriptions");
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Subject-scoped helpers ────────────────────────────────────────────────

async function ensureSubjectAccess(
  subjectType: SubscriptionSubjectType,
  subjectId: string
): Promise<{ userId: string }> {
  if (subjectType === "Org") {
    const ctx = await requireOrgRole(subjectId, { adminOnly: true });
    return { userId: ctx.userId };
  }
  const ctx = await requireSession();
  if (subjectId !== ctx.userId) {
    throw new AuthError("FORBIDDEN_SUBJECT", "Not your subscription.", 403);
  }
  return { userId: ctx.userId };
}

// ── Subscription Center reads ─────────────────────────────────────────────

export async function getCurrentSubscriptionAction(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
}): Promise<{ data: SubscriptionWithPlan | null; error: string | null }> {
  try {
    if (opts.subjectType === "Org") {
      await requireOrgRole(opts.subjectId);
    } else {
      const ctx = await requireSession();
      if (opts.subjectId !== ctx.userId) {
        return { data: null, error: "FORBIDDEN_SUBJECT" };
      }
    }
    const data = await getCurrentSubscription(opts.subjectType, opts.subjectId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getOrgUsageAction(
  orgId: string
): Promise<{ data: SubscriptionUsage | null; error: string | null }> {
  try {
    await requireOrgRole(orgId);
    const data = await getOrgUsage(orgId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Subscribe / upgrade ───────────────────────────────────────────────────

export async function subscribeToPlanAction(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  planId: string;
  billing?: BillingInfoInput;
}): Promise<{
  data: {
    subscriptionId: string;
    invoiceId: string;
    intentId: string | null;
  } | null;
  redirectTo: string | null;
  error: string | null;
}> {
  try {
    const { userId } = await ensureSubjectAccess(opts.subjectType, opts.subjectId);
    const result = await subscribeToPlan({
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      planId: opts.planId,
      userId,
      billing: opts.billing,
    });
    await writeAuditLog({
      action: "subscribe_plan",
      resourceType: "subscription",
      resourceId: result.subscription.id,
      orgId: opts.subjectType === "Org" ? opts.subjectId : null,
      actorUserId: userId,
      newValue: {
        planId: opts.planId,
        intentId: result.intent?.id ?? null,
        invoiceId: result.invoice.id,
      },
    });

    const billingBase =
      opts.subjectType === "Org"
        ? `/dashboard/organization/${opts.subjectId}/billing`
        : `/dashboard/billing`;
    const redirectTo = result.intent
      ? `${billingBase}/checkout/${result.intent.id}`
      : `${billingBase}`;

    return {
      data: {
        subscriptionId: result.subscription.id,
        invoiceId: result.invoice.id,
        intentId: result.intent?.id ?? null,
      },
      redirectTo,
      error: null,
    };
  } catch (err) {
    if (err instanceof AuthError) {
      return { data: null, redirectTo: null, error: err.code };
    }
    return {
      data: null,
      redirectTo: null,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

export async function subscribeAndRedirectAction(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
  planId: string;
  billing?: BillingInfoInput;
}): Promise<{ error: string | null }> {
  const res = await subscribeToPlanAction(opts);
  if (res.error || !res.redirectTo) {
    return { error: res.error ?? "unknown" };
  }
  redirect(res.redirectTo);
}

// ── Confirm mock payment ──────────────────────────────────────────────────

export async function confirmMockPaymentAction(intentId: string): Promise<{
  data: { intent: PaymentIntent; invoice: Invoice; subscription: Subscription | null } | null;
  error: string | null;
}> {
  try {
    const ctx = await requireSession();

    // Resolve the orgs where the caller is an Active Org Admin so the
    // service-layer authorisation check can verify B2B invoices belong
    // to one of them. Reads via service client so RLS doesn't filter
    // away rows the caller hasn't visited yet this session.
    const svcDb = createServiceClient();
    const { data: adminRows } = await svcDb
      .from("OrganizationMembers")
      .select("org_id")
      .eq("user_id", ctx.userId)
      .eq("status", "Active")
      .eq("role_id", ROLE_ADMIN_ID);
    const adminOrgIds = (adminRows ?? [])
      .map((r) => (r as { org_id: string | null }).org_id)
      .filter((x): x is string => typeof x === "string");

    const result = await confirmMockPayment(intentId, {
      userId: ctx.userId,
      adminOrgIds,
    });
    await writeAuditLog({
      action: "confirm_mock_payment",
      resourceType: "payment_intent",
      resourceId: intentId,
      actorUserId: ctx.userId,
      orgId:
        result.subscription?.subject_type === "Org"
          ? result.subscription.subject_id
          : null,
      newValue: { invoiceId: result.invoice.id },
    });
    return { data: result, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── Invoice list / detail / intent ────────────────────────────────────────

export async function listInvoicesAction(opts: {
  subjectType: SubscriptionSubjectType;
  subjectId: string;
}): Promise<{ data: Invoice[]; error: string | null }> {
  try {
    if (opts.subjectType === "Org") {
      await requireOrgRole(opts.subjectId, { adminOnly: true });
    } else {
      const ctx = await requireSession();
      if (opts.subjectId !== ctx.userId) {
        return { data: [], error: "FORBIDDEN_SUBJECT" };
      }
    }
    const data = await listInvoices(opts.subjectType, opts.subjectId);
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: [], error: err.code };
    return { data: [], error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function getInvoiceWithIntentAction(
  invoiceId: string
): Promise<{
  data: { invoice: Invoice | null; intent: PaymentIntent | null };
  error: string | null;
}> {
  try {
    await requireSession();
    const invoice = await getInvoice(invoiceId);
    if (!invoice) return { data: { invoice: null, intent: null }, error: null };
    // Re-check access via subject
    if (invoice.subject_type === "Org") {
      await requireOrgRole(invoice.subject_id, { adminOnly: true });
    } else {
      const ctx = await requireSession();
      if (invoice.subject_id !== ctx.userId) {
        return {
          data: { invoice: null, intent: null },
          error: "FORBIDDEN_SUBJECT",
        };
      }
    }
    const intent = await getActiveIntentForInvoice(invoiceId);
    return { data: { invoice, intent }, error: null };
  } catch (err) {
    if (err instanceof AuthError)
      return { data: { invoice: null, intent: null }, error: err.code };
    return {
      data: { invoice: null, intent: null },
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// ── Billing info + cancel ─────────────────────────────────────────────────

export async function updateBillingInfoAction(opts: {
  subscriptionId: string;
  input: BillingInfoInput;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSession();
    const sub = await getSubscriptionById(opts.subscriptionId);
    if (!sub) return { ok: false, error: "SUBSCRIPTION_NOT_FOUND" };
    if (sub.subject_type === "Org") {
      await requireOrgRole(sub.subject_id, { adminOnly: true });
    } else if (sub.subject_id !== ctx.userId) {
      return { ok: false, error: "FORBIDDEN_SUBJECT" };
    }
    await updateBillingInfo(opts.subscriptionId, opts.input);
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function cancelSubscriptionAction(
  subscriptionId: string,
  reason?: string,
  feedback?: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSession();
    const sub = await getSubscriptionById(subscriptionId);
    if (!sub) return { ok: false, error: "SUBSCRIPTION_NOT_FOUND" };
    if (sub.subject_type === "Org") {
      await requireOrgRole(sub.subject_id, { adminOnly: true });
    } else if (sub.subject_id !== ctx.userId) {
      return { ok: false, error: "FORBIDDEN_SUBJECT" };
    }
    await cancelSubSvc(subscriptionId, reason, feedback);
    await writeAuditLog({
      action: "cancel_subscription",
      resourceType: "subscription",
      resourceId: subscriptionId,
      orgId: sub.subject_type === "Org" ? sub.subject_id : null,
      actorUserId: ctx.userId,
      newValue: { reason: reason ?? null, feedback: feedback ?? null },
    });
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function reactivateAutoRenewAction(
  subscriptionId: string
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const ctx = await requireSession();
    const sub = await getSubscriptionById(subscriptionId);
    if (!sub) return { ok: false, error: "SUBSCRIPTION_NOT_FOUND" };
    if (sub.subject_type === "Org") {
      await requireOrgRole(sub.subject_id, { adminOnly: true });
    } else if (sub.subject_id !== ctx.userId) {
      return { ok: false, error: "FORBIDDEN_SUBJECT" };
    }
    await reactivateAutoRenew(subscriptionId);
    await writeAuditLog({
      action: "reactivate_auto_renew",
      resourceType: "subscription",
      resourceId: subscriptionId,
      orgId: sub.subject_type === "Org" ? sub.subject_id : null,
      actorUserId: ctx.userId,
    });
    return { ok: true, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
