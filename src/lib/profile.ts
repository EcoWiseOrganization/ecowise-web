/**
 * Pure helpers used by both server and client components for the profile
 * screen. Kept dependency-free so they are easy to unit-test.
 */

export type Tier = "Bronze" | "Silver" | "Gold" | "Platinum";

/**
 * Derives a tier label from the user's green-point balance. Thresholds are
 * deliberately simple — they will be replaced by the gamification engine in
 * Phase 9 once badges/challenges land.
 */
export function tierFromPoints(points: number): Tier {
  if (points >= 5000) return "Platinum";
  if (points >= 1500) return "Gold";
  if (points >= 500) return "Silver";
  return "Bronze";
}

/**
 * Validates a password against MSG20 (length policy ≥ 8 chars + at least 1
 * letter and 1 digit). Mirrors the rule used at registration.
 */
export function isValidPasswordPolicy(pwd: string): boolean {
  if (typeof pwd !== "string") return false;
  if (pwd.length < 8) return false;
  return /[A-Za-z]/.test(pwd) && /\d/.test(pwd);
}

/** Phone validation — accepts E.164-ish or local 9-15 digit formats. */
export function isValidPhone(phone: string): boolean {
  if (!phone) return true; // optional
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 9 && digits.length <= 15;
}
