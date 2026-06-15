/**
 * Pure billing helpers (Phase 7). No I/O — easy to unit-test.
 */

import { randomInt } from "node:crypto";
import type { SubscriptionBillingCycle } from "@/types/subscription.types";

const SUFFIX_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateInvoiceNumber(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  // 8-char cryptographically-random suffix. The previous version used
  // Math.random() — not suitable for unique identifiers (predictable
  // RNG + lower entropy). With 36^8 ≈ 2.8 × 10¹² suffixes per day the
  // birthday-collision odds are negligible for any realistic invoice
  // volume; the `invoice_number` column also carries a UNIQUE
  // constraint so a one-in-a-trillion clash bubbles as a normal
  // 23505 retry rather than corrupt data.
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += SUFFIX_ALPHABET[randomInt(0, SUFFIX_ALPHABET.length)];
  }
  return `INV-${yyyy}${mm}${dd}-${suffix}`;
}

/** Returns ISO timestamp `count` cycles after `start` (Monthly or Annual). */
export function periodEnd(
  start: Date,
  cycle: SubscriptionBillingCycle,
  count: number = 1
): Date {
  const out = new Date(start);
  if (cycle === "Lifetime") {
    // No real expiry — park the period end a century out so lifecycle
    // jobs never pick it up and the period-order CHECK is satisfied.
    out.setUTCFullYear(out.getUTCFullYear() + 100);
  } else if (cycle === "Annual") {
    out.setUTCFullYear(out.getUTCFullYear() + count);
  } else if (cycle === "Quarterly") {
    out.setUTCMonth(out.getUTCMonth() + 3 * count);
  } else {
    out.setUTCMonth(out.getUTCMonth() + count);
  }
  return out;
}

/**
 * BR-09 helper — given current usage and the plan's quotas, returns
 * remaining capacity. NULL maxes mean unlimited.
 */
export function quotaRemaining(
  current: number,
  max: number | null
): { remaining: number; blocked: boolean; unlimited: boolean } {
  if (max === null || max === undefined) {
    return { remaining: Number.POSITIVE_INFINITY, blocked: false, unlimited: true };
  }
  const remaining = Math.max(0, max - current);
  return { remaining, blocked: remaining <= 0, unlimited: false };
}

/** Trial / period status helpers. */
export function isTrialActive(trialEnd: string | null, now: Date = new Date()): boolean {
  if (!trialEnd) return false;
  return new Date(trialEnd).getTime() > now.getTime();
}

/** Mock payment QR payload — provider-agnostic placeholder. */
export function buildMockQrPayload(opts: {
  invoiceNumber: string;
  amount: number;
  currency: string;
}): string {
  return `MOCK|${opts.invoiceNumber}|${opts.amount.toFixed(2)}|${opts.currency}`;
}

/** Mock payment intent expiry: 15 minutes from now. */
export function paymentIntentExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + 15 * 60 * 1000);
}
