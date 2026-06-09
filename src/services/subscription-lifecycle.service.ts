/**
 * Subscription lifecycle worker (Phase 8).
 * Designed to run from a cron endpoint (or Supabase Edge Function). Pure
 * effects: DB updates + emails. Returns a summary report so the operator
 * can audit per-tick decisions.
 */

import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildMockQrPayload,
  generateInvoiceNumber,
  paymentIntentExpiry,
  periodEnd,
} from "@/lib/billing";
import {
  decideLifecycleAction,
  MAX_RENEWAL_RETRIES,
  terminalStatusForRetryCap,
  type LifecycleAction,
} from "@/lib/subscription-lifecycle";
import {
  renewalFailedEmail,
  renewalSuccessEmail,
  sendEmail,
  subscriptionCanceledEmail,
  trialEndingEmail,
} from "@/lib/emails";
import { writeAuditLog } from "@/services/audit.service";
import type {
  Invoice,
  InvoiceLineItem,
  Subscription,
  SubscriptionPlan,
} from "@/types/subscription.types";

export interface LifecycleTickReport {
  scanned: number;
  renewed: number;
  failed: number;
  /** Bumped when the unique constraint on Invoices catches a duplicate
   *  renewal — i.e. another concurrent tick already handled this sub. */
  skippedDuplicate: number;
  canceled: number;
  expired: number;
  trialReminders: number;
  noop: number;
  errors: { subscriptionId: string; message: string }[];
}

export interface RunOpts {
  /**
   * "success" → mock auto-pay always succeeds (default).
   * "fail"    → mock auto-pay always fails (BR-10 retry path).
   * "random"  → 50/50 — useful for soak testing.
   */
  renewalOutcome?: "success" | "fail" | "random";
  /** Override `now` for testability. */
  now?: Date;
}

interface SubWithPlan extends Subscription {
  plan: SubscriptionPlan;
}

async function loadCandidates(now: Date): Promise<SubWithPlan[]> {
  const db = createServiceClient();
  const horizon = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("Subscriptions")
    .select(`*, plan:SubscriptionPlans(*)`)
    .in("status", ["Trial", "Active", "PastDue"])
    // Pre-filter: anything either with period_end already passed, or trial
    // ending within 7 days, or PastDue (which we always re-evaluate).
    .or(
      `current_period_end.lte.${now.toISOString()},trial_end.lte.${horizon},status.eq.PastDue`
    );
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown) as SubWithPlan[];
}

async function getBillingEmail(sub: SubWithPlan): Promise<string | null> {
  if (sub.billing_email) return sub.billing_email;
  const db = createServiceClient();
  if (sub.subject_type === "User") {
    const { data } = await db
      .from("User")
      .select("email")
      .eq("id", sub.subject_id)
      .maybeSingle();
    return (data as { email: string } | null)?.email ?? null;
  }
  const { data } = await db
    .from("Organization")
    .select("contact_email")
    .eq("id", sub.subject_id)
    .maybeSingle();
  return (data as { contact_email: string } | null)?.contact_email ?? null;
}

function shouldRenewalSucceed(opts: RunOpts | undefined): boolean {
  if (opts?.renewalOutcome === "fail") return false;
  if (opts?.renewalOutcome === "random") return Math.random() < 0.5;
  return true;
}

async function attemptRenewal(
  sub: SubWithPlan,
  now: Date,
  outcome: boolean
): Promise<{
  status: "renewed" | "failed" | "skipped_duplicate";
  error?: string;
  invoice?: Invoice;
  newPeriodEnd?: Date;
}> {
  const db = createServiceClient();
  const newStart = now;
  const newEnd = periodEnd(newStart, sub.plan.billing_cycle);
  const lineItems: InvoiceLineItem[] = [
    {
      description: `${sub.plan.plan_name} renewal (${sub.plan.billing_cycle})`,
      quantity: 1,
      unit_price: Number(sub.plan.base_price_usd),
      amount: Number(sub.plan.base_price_usd),
    },
  ];
  const invoiceNumber = generateInvoiceNumber(now);

  const { data: invRow, error: invErr } = await db
    .from("Invoices")
    .insert({
      subscription_id: sub.id,
      invoice_number: invoiceNumber,
      subject_type: sub.subject_type,
      subject_id: sub.subject_id,
      billing_reason: "renewal",
      amount: Number(sub.plan.base_price_usd),
      currency: "USD",
      status: outcome ? "Paid" : "PendingPayment",
      issue_date: now.toISOString().slice(0, 10),
      due_date: newEnd.toISOString().slice(0, 10),
      paid_at: outcome ? now.toISOString() : null,
      line_items: lineItems,
      created_by: sub.created_by,
    })
    .select()
    .single();
  if (invErr || !invRow) {
    // Postgres 23505 = unique_violation on the
    // `invoices_dedup_per_period_unique` constraint added in migration
    // 025. Another lifecycle tick already created the renewal invoice
    // for this (subscription, billing_reason, due_date) — short-circuit
    // gracefully instead of double-billing or throwing.
    if (invErr?.code === "23505") {
      return { status: "skipped_duplicate" };
    }
    return { status: "failed", error: invErr?.message ?? "INSERT_FAILED" };
  }
  const invoice = invRow as Invoice;

  if (outcome) {
    await db
      .from("Subscriptions")
      .update({
        status: "Active",
        current_period_start: newStart.toISOString(),
        current_period_end: newEnd.toISOString(),
        retry_count: 0,
        last_renewal_attempt_at: now.toISOString(),
        last_renewal_error: null,
      })
      .eq("id", sub.id);
    return { status: "renewed", invoice, newPeriodEnd: newEnd };
  }

  // Failed renewal: create payment intent so user can recover via UI.
  await db
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
      expires_at: paymentIntentExpiry(now).toISOString(),
    });
  await db
    .from("Subscriptions")
    .update({
      status: "PastDue",
      retry_count: sub.retry_count + 1,
      last_renewal_attempt_at: now.toISOString(),
      last_renewal_error: "mock_payment_failed",
    })
    .eq("id", sub.id);
  return { status: "failed", error: "mock_payment_failed", invoice };
}

async function terminate(sub: SubWithPlan, now: Date): Promise<void> {
  const db = createServiceClient();
  const finalStatus = terminalStatusForRetryCap(sub.status);
  await db
    .from("Subscriptions")
    .update({
      status: finalStatus,
      canceled_at: now.toISOString(),
      auto_renew: false,
    })
    .eq("id", sub.id);
}

async function expireCanceled(sub: SubWithPlan, now: Date): Promise<void> {
  const db = createServiceClient();
  await db
    .from("Subscriptions")
    .update({ status: "Canceled", canceled_at: now.toISOString() })
    .eq("id", sub.id);
}

async function markTrialReminderSent(subId: string, now: Date): Promise<void> {
  const db = createServiceClient();
  await db
    .from("Subscriptions")
    .update({ trial_reminder_sent_at: now.toISOString() })
    .eq("id", subId);
}

// ── Public worker ─────────────────────────────────────────────────────────

export async function runLifecycleTick(
  opts: RunOpts = {}
): Promise<LifecycleTickReport> {
  const now = opts.now ?? new Date();
  const candidates = await loadCandidates(now);

  const report: LifecycleTickReport = {
    scanned: candidates.length,
    renewed: 0,
    failed: 0,
    skippedDuplicate: 0,
    canceled: 0,
    expired: 0,
    trialReminders: 0,
    noop: 0,
    errors: [],
  };

  for (const sub of candidates) {
    try {
      const action: LifecycleAction = decideLifecycleAction(sub, now);

      if (action === "renewal_due") {
        const success = shouldRenewalSucceed(opts);
        const result = await attemptRenewal(sub, now, success);

        const billingEmail = await getBillingEmail(sub);

        if (result.status === "skipped_duplicate") {
          // Another tick won the unique-constraint race for this
          // (subscription, billing_reason, due_date). No state to
          // change, no email to send — just count and move on.
          report.skippedDuplicate += 1;
        } else if (result.status === "renewed") {
          report.renewed += 1;
          await writeAuditLog({
            action: "subscription_renewed",
            resourceType: "subscription",
            resourceId: sub.id,
            orgId: sub.subject_type === "Org" ? sub.subject_id : null,
            newValue: { invoiceId: result.invoice?.id ?? null },
          });
          if (billingEmail) {
            const tpl = renewalSuccessEmail({
              planName: sub.plan.plan_name,
              amount: Number(sub.plan.base_price_usd),
              currency: "USD",
              invoiceNumber: result.invoice!.invoice_number,
              nextBilling: result.newPeriodEnd!.toISOString().slice(0, 10),
            });
            await sendEmail({ to: billingEmail, ...tpl });
          }
        } else {
          report.failed += 1;
          await writeAuditLog({
            action: "subscription_renewal_failed",
            resourceType: "subscription",
            resourceId: sub.id,
            orgId: sub.subject_type === "Org" ? sub.subject_id : null,
            status: "failure",
            errorMessage: result.error ?? "unknown",
            newValue: { retryCount: sub.retry_count + 1 },
          });
          if (billingEmail) {
            const tpl = renewalFailedEmail({
              planName: sub.plan.plan_name,
              amount: Number(sub.plan.base_price_usd),
              currency: "USD",
              retryCount: sub.retry_count + 1,
              nextRetry: new Date(now.getTime() + 86_400_000)
                .toISOString()
                .slice(0, 10),
            });
            await sendEmail({ to: billingEmail, ...tpl });
          }
        }
      } else if (action === "force_terminate") {
        await terminate(sub, now);
        report.canceled += 1;
        await writeAuditLog({
          action: "subscription_force_canceled",
          resourceType: "subscription",
          resourceId: sub.id,
          orgId: sub.subject_type === "Org" ? sub.subject_id : null,
          newValue: { reason: "billing_failed", retryCount: sub.retry_count },
        });
        const billingEmail = await getBillingEmail(sub);
        if (billingEmail) {
          const tpl = subscriptionCanceledEmail({
            planName: sub.plan.plan_name,
            reason: "billing_failed",
          });
          await sendEmail({ to: billingEmail, ...tpl });
        }
      } else if (action === "expire_canceled") {
        await expireCanceled(sub, now);
        report.expired += 1;
        await writeAuditLog({
          action: "subscription_expired",
          resourceType: "subscription",
          resourceId: sub.id,
          orgId: sub.subject_type === "Org" ? sub.subject_id : null,
        });
        const billingEmail = await getBillingEmail(sub);
        if (billingEmail) {
          const tpl = subscriptionCanceledEmail({
            planName: sub.plan.plan_name,
            reason: "user_cancel",
            endsOn: sub.current_period_end.slice(0, 10),
          });
          await sendEmail({ to: billingEmail, ...tpl });
        }
      } else if (action === "trial_reminder") {
        await markTrialReminderSent(sub.id, now);
        report.trialReminders += 1;
        const billingEmail = await getBillingEmail(sub);
        if (billingEmail && sub.trial_end) {
          const tpl = trialEndingEmail({
            planName: sub.plan.plan_name,
            trialEnd: sub.trial_end.slice(0, 10),
          });
          await sendEmail({ to: billingEmail, ...tpl });
        }
      } else {
        report.noop += 1;
      }
    } catch (err) {
      report.errors.push({
        subscriptionId: sub.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return report;
}

// ── Test/admin: simulate a single failed renewal ─────────────────────────

export async function simulateFailedRenewal(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string; newRetryCount?: number }> {
  const db = createServiceClient();
  const { data: subRow } = await db
    .from("Subscriptions")
    .select(`*, plan:SubscriptionPlans(*)`)
    .eq("id", subscriptionId)
    .maybeSingle();
  if (!subRow) return { ok: false, error: "SUBSCRIPTION_NOT_FOUND" };

  const sub = (subRow as unknown) as SubWithPlan;
  const result = await attemptRenewal(sub, new Date(), false);

  // After incrementing, also evaluate force termination if cap is hit.
  const newRetry = sub.retry_count + 1;
  if (newRetry >= MAX_RENEWAL_RETRIES) {
    await terminate(sub, new Date());
  }

  return {
    ok: result.status === "failed",
    error: result.error,
    newRetryCount: newRetry,
  };
}
