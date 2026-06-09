-- ================================================================
-- EcoWise: carry register metadata in otp_verifications
-- Migration: 022_otp_metadata
-- ================================================================
--
-- Register-by-OTP used to round-trip the user's password through
-- `sessionStorage` between /register and /register/verify because the
-- server didn't remember anything other than the OTP code. We're
-- removing that round-trip; the user types their password only on the
-- verify step. The server needs to remember the user's `name` (chosen
-- at step 1) so the eventual `auth.signUp(...).options.data.full_name`
-- can be filled in. Persist it in the same OTP row.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.otp_verifications
  ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN public.otp_verifications.name IS
  'Full name captured at /register step 1; used on verify to seed auth.users.user_metadata.';
