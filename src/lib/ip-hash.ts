import "server-only";
import { createHmac } from "node:crypto";

/**
 * Stable, deterministic IP hash for long-term storage on guest
 * submission rows.
 *
 * Storing raw IP in `EventPublicSubmissions.ip_address` / similar
 * audit tables creates a long-tail PII liability: a year-old log
 * with `203.0.113.42 + attendee_email` can be cross-referenced with
 * other breaches to deanonymise the attendee. The IP is genuinely
 * useful for abuse-pattern triage ("the same actor submitted N
 * forms across orgs M, P, Q") — so we don't want to drop it
 * outright, just stop holding the plaintext.
 *
 * HMAC-SHA-256 with a server-side pepper:
 *   • Same IP always hashes to the same 64-char hex string, so the
 *     correlation use case still works at SQL-equality speed.
 *   • Without the pepper an attacker who steals the table cannot
 *     enumerate /32 IPv4 space (2^32 hashes) or guess targeted IPs.
 *   • Rotating the pepper invalidates all historical correlation —
 *     that's a feature, not a bug: it's also the "right to be
 *     forgotten" lever.
 *
 * `IP_HASH_SECRET` env var SHOULD be set in production. In its
 * absence we fall back to `AUTH_COOKIE_SECRET` (already provisioned
 * for the admin-role cookie). If neither is set we hash with the
 * literal "dev-pepper" and log once — this guarantees the call site
 * never crashes during local dev but flags the gap loudly.
 *
 * Pass `null` / empty → returns `null`. Honours the caller's intent
 * to omit IP rather than emitting a meaningless hash of an empty
 * string.
 */
let warnedAboutFallback = false;

function getSecret(): string {
  const s =
    process.env.IP_HASH_SECRET ?? process.env.AUTH_COOKIE_SECRET ?? "";
  if (s.length >= 16) return s;
  if (!warnedAboutFallback) {
    console.warn(
      "[ip-hash] IP_HASH_SECRET (or AUTH_COOKIE_SECRET) not set — falling back to a dev pepper. " +
        "Production IP hashes will be guessable. Set IP_HASH_SECRET to a 32+ char random value.",
    );
    warnedAboutFallback = true;
  }
  return "dev-pepper-do-not-use-in-prod";
}

/**
 * Hash an IP for storage. Returns null when the input is null /
 * undefined / empty after trim. The output is 64-char lowercase hex
 * — fits TEXT columns sized for IP strings without schema changes.
 */
export function hashIpForStorage(ip: string | null | undefined): string | null {
  if (ip === null || ip === undefined) return null;
  const trimmed = ip.trim();
  if (trimmed.length === 0) return null;
  return createHmac("sha256", getSecret()).update(trimmed).digest("hex");
}
