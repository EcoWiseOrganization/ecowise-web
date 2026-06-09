-- ================================================================
-- EcoWise: auth surface rate limit table
-- Migration: 023_auth_rate_limits
-- ================================================================
--
-- Tracks per-bucket attempt timestamps so we can throttle:
--   - login (by email and by IP, independently)
--   - register OTP send (by email and by IP)
--   - forgot-password OTP send (by email and by IP)
--
-- Bucket is a free-form string like:
--   "login:email:user@x.com"
--   "login:ip:1.2.3.4"
--   "send-otp:email:user@x.com"
--   "forgot-otp:ip:1.2.3.4"
--
-- Sliding-window lookup is done by the app: SELECT WHERE bucket=$1 AND
-- created_at >= now() - INTERVAL '$window'. The index on (bucket,
-- created_at DESC) makes that O(log n).
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public."AuthRateLimits" (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket      TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_bucket_created_idx
  ON public."AuthRateLimits" (bucket, created_at DESC);

ALTER TABLE public."AuthRateLimits" ENABLE ROW LEVEL SECURITY;

-- Only the service-role client writes/reads this table — no end-user
-- ever queries it directly. Deny all PostgREST traffic at the policy
-- layer as belt-and-braces.
DROP POLICY IF EXISTS "AuthRateLimits: service role only" ON public."AuthRateLimits";
CREATE POLICY "AuthRateLimits: service role only"
  ON public."AuthRateLimits" FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public."AuthRateLimits" IS
  'Per-bucket attempt timestamps for login / send-otp / forgot-otp throttling.';
