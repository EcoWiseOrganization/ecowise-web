/**
 * Pure validators shared between client + server. Avoid heavy regex libraries
 * — these are intentionally permissive at the edges.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

export function trimToMax(value: string, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

/**
 * Honeypot validator — public forms should include a hidden `website` (or
 * similar) field that real users never fill in. Bots often auto-populate
 * every text input → reject when the value is non-empty.
 */
export function isHoneypotClean(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}
