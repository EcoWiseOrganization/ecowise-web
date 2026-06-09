-- ================================================================
-- EcoWise: harden OTP verification table
-- Migration: 021_otp_lockout
-- ================================================================
--
-- Ensures `otp_verifications` exists with the columns the auth routes
-- now rely on. The table was originally created ad-hoc via Supabase
-- Studio, so this migration is defensive: it CREATEs IF NOT EXISTS,
-- then ALTERs to ADD COLUMN IF NOT EXISTS the new lockout fields.
--
-- New columns:
--   - failed_attempts INT NOT NULL DEFAULT 0
--       Incremented on each wrong OTP submission. The API rejects and
--       deletes the row once it reaches 5 — capping brute-force at
--       5/code-window instead of 9 999/code-window.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL,
  otp             TEXT        NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_verifications
  ADD COLUMN IF NOT EXISTS failed_attempts INT NOT NULL DEFAULT 0;

-- Email lookup runs on every verify; keep it cheap.
CREATE INDEX IF NOT EXISTS otp_verifications_email_idx
  ON public.otp_verifications (lower(email));

-- The service-role client is the only writer; readers via app server-side
-- only. We keep RLS enabled to be safe in case anon ever talks to it.
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otp_verifications: service role only" ON public.otp_verifications;
CREATE POLICY "otp_verifications: service role only"
  ON public.otp_verifications FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
