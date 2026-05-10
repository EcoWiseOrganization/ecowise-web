/**
 * Pure lifecycle helpers (Phase 8).
 *
 *   • Identifies subscriptions that should be renewed/cancelled/notified.
 *   • Constants & rules co-located so the cron worker stays I/O-only.
 */

import type {
  Subscription,
  SubscriptionStatus,
} from "@/types/subscription.types";

/** BR-10: after this many failed renewal attempts, transition to terminal state. */
export const MAX_RENEWAL_RETRIES = 3;

/** Trial reminder lead time in days. */
export const TRIAL_REMINDER_DAYS = 3;

export type LifecycleAction =
  | "renewal_due"
  | "trial_reminder"
  | "force_terminate"
  | "expire_canceled"
  | "noop";

/**
 * Decide what the lifecycle worker should do for a single subscription
 * snapshot. Pure — given the same inputs, always returns the same action.
 *
 * Order of precedence (highest first):
 *   1. PastDue + retry_count >= MAX_RENEWAL_RETRIES → force_terminate
 *   2. status Active|Trial|PastDue + period_end ≤ now + auto_renew=true → renewal_due
 *   3. status Active + period_end ≤ now + auto_renew=false → expire_canceled
 *   4. status Trial + trial_end within TRIAL_REMINDER_DAYS + reminder not sent → trial_reminder
 *   5. otherwise → noop
 */
export function decideLifecycleAction(
  sub: Pick<
    Subscription,
    | "status"
    | "current_period_end"
    | "trial_end"
    | "auto_renew"
    | "retry_count"
    | "trial_reminder_sent_at"
  >,
  now: Date = new Date()
): LifecycleAction {
  const periodEndAt = new Date(sub.current_period_end).getTime();
  const trialEndAt = sub.trial_end ? new Date(sub.trial_end).getTime() : null;
  const t = now.getTime();

  if (sub.status === "PastDue" && sub.retry_count >= MAX_RENEWAL_RETRIES) {
    return "force_terminate";
  }

  if (
    (sub.status === "Active" ||
      sub.status === "Trial" ||
      sub.status === "PastDue") &&
    periodEndAt <= t &&
    sub.auto_renew
  ) {
    return "renewal_due";
  }

  if (sub.status === "Active" && periodEndAt <= t && !sub.auto_renew) {
    return "expire_canceled";
  }

  if (
    sub.status === "Trial" &&
    trialEndAt !== null &&
    trialEndAt > t &&
    trialEndAt - t <= TRIAL_REMINDER_DAYS * 86_400_000 &&
    !sub.trial_reminder_sent_at
  ) {
    return "trial_reminder";
  }

  return "noop";
}

/**
 * Returns the subscription status to assign after exceeding the retry
 * threshold. We prefer "Canceled" so historical access ends cleanly; the
 * "Suspended" lane is reserved for cases where billing is paused without
 * voluntary cancellation (e.g. compliance hold) — set explicitly elsewhere.
 */
export function terminalStatusForRetryCap(
  current: SubscriptionStatus
): SubscriptionStatus {
  if (current === "Trial") return "Canceled";
  return "Canceled";
}
