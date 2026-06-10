import type { NextConfig } from "next";

/**
 * Baseline security headers applied to every response.
 *
 * Goals:
 *   • Clickjacking — frame-ancestors / X-Frame-Options
 *   • MIME sniffing — X-Content-Type-Options
 *   • Referrer leakage — Referrer-Policy
 *   • Device API abuse — Permissions-Policy
 *   • Mixed-content over HTTPS — Strict-Transport-Security (HSTS)
 *   • Asset origin allowlist — CSP
 *
 * CSP notes:
 *   • Next.js 16's React Server Components emit inline `<script>` and
 *     `<style>` blocks, so we cannot ship a strict no-`'unsafe-inline'`
 *     policy without adopting nonce-based CSP across every component
 *     render. The relaxations below are the published Next.js
 *     recommendation; we tighten the rest of the policy aggressively.
 *   • `connect-src` lists the Supabase wildcard so the browser SDK
 *     can both REST-call and WebSocket-stream against the project
 *     hostname without an env-var-driven exact match.
 *   • `img-src` permits `https:` because the app renders avatars +
 *     evidence URLs from Supabase Storage signed URLs which rotate
 *     hosts; locking to a single CDN would break uploads.
 *   • Cron / Vercel preview deploys need `upgrade-insecure-requests`
 *     so first-party fetches over `http:` are auto-upgraded.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
