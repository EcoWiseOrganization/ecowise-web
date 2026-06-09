import "server-only";
import { randomInt } from "crypto";

/**
 * OTP helpers shared by registration and forgot-password flows.
 *
 * - 6-digit codes generated via `crypto.randomInt` (cryptographically
 *   random, not Math.random). 6 digits = 1M codes vs 4 digits = 10k —
 *   a 100× brute-force tax on top of the per-row lockout.
 * - Email is normalised once at the entry point so downstream lookups
 *   are case-insensitive and whitespace-tolerant.
 * - `MAX_ATTEMPTS` caps wrong submissions per code-window. The route
 *   deletes the row once it reaches this cap so the attacker must
 *   restart from /send-otp (which is itself rate-limited).
 */

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 5;
export const MAX_ATTEMPTS = 5;

/** Cryptographically-random N-digit code as a zero-padded string. */
export function generateOtp(): string {
  // randomInt is inclusive lower / exclusive upper.
  const min = 0;
  const max = 10 ** OTP_LENGTH;
  return String(randomInt(min, max)).padStart(OTP_LENGTH, "0");
}

/** Normalise an email address for OTP table lookup. */
export function normaliseEmail(input: unknown): string {
  return String(input ?? "").trim().toLowerCase();
}

/** Compute the expires_at timestamp for a freshly-issued OTP. */
export function otpExpiry(): string {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
}
