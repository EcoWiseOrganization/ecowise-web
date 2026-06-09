import "server-only";

/**
 * Resolve the canonical site URL for redirects.
 *
 * Source priority:
 *   1. `NEXT_PUBLIC_SITE_URL` — set explicitly in env; the canonical
 *      value Vercel + Supabase OAuth should agree on.
 *   2. `x-forwarded-host` header — only honoured in non-production so
 *      local dev (and previews where the env var hasn't been added
 *      yet) keep working. Spoofable; we MUST NOT trust it in prod.
 *   3. Hard fail in production. The OAuth redirect URL must match what's
 *      whitelisted in Supabase; falling through to a host we don't
 *      control would either produce a confusing OAuth failure or, worse,
 *      let an attacker host a callback page that looks like ours.
 *
 * Returns the trimmed origin (no trailing slash). Throws when no safe
 * value is available and the environment is production.
 */
export function resolveSiteUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV !== "production") {
    const fwd = request.headers.get("x-forwarded-host");
    if (fwd) return `https://${fwd}`;
    return new URL(request.url).origin;
  }

  // Production with no NEXT_PUBLIC_SITE_URL is a misconfiguration —
  // fail loudly instead of silently accepting a spoofed host header.
  throw new Error(
    "NEXT_PUBLIC_SITE_URL is required in production but is not set",
  );
}
