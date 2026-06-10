-- ================================================================
-- EcoWise: TTL cleanup helper for rate-limit tables
-- Migration: 029_rate_limit_cleanup
-- ================================================================
--
-- The three rate-limit tables (`ContactRateLimits`,
-- `EventPublicFormRateLimits`, `AuthRateLimits` from migrations 007 /
-- 010 / 023) never had a cleanup path. Rows accumulate forever and the
-- supporting indexes grow alongside them. None of the limiter
-- queries care about rows older than the longest window (1 hour
-- today), so we can safely delete anything beyond a comfortable
-- multiple of that.
--
-- This migration ships a single helper `purge_expired_rate_limits()`
-- that the cron endpoint (or a one-off operator command) can call.
-- It returns the per-table row count so ops can chart the sweep.
--
-- Idempotent: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.purge_expired_rate_limits(
  p_window_hours INTEGER DEFAULT 24
) RETURNS TABLE(
  contact_deleted BIGINT,
  event_form_deleted BIGINT,
  auth_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - (p_window_hours || ' hours')::INTERVAL;
  v_contact BIGINT := 0;
  v_event   BIGINT := 0;
  v_auth    BIGINT := 0;
BEGIN
  -- ContactRateLimits (migration 007 column `ip_address` + created_at).
  -- The table may not exist on installs that skipped that migration —
  -- wrap in DO blocks so a missing table doesn't break the sweep.
  IF EXISTS (
    SELECT 1 FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'ContactRateLimits'
  ) THEN
    DELETE FROM public."ContactRateLimits"
     WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_contact = ROW_COUNT;
  END IF;

  -- EventPublicFormRateLimits (migration 010).
  IF EXISTS (
    SELECT 1 FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'EventPublicFormRateLimits'
  ) THEN
    DELETE FROM public."EventPublicFormRateLimits"
     WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_event = ROW_COUNT;
  END IF;

  -- AuthRateLimits (migration 023).
  IF EXISTS (
    SELECT 1 FROM pg_tables
     WHERE schemaname = 'public' AND tablename = 'AuthRateLimits'
  ) THEN
    DELETE FROM public."AuthRateLimits"
     WHERE created_at < v_cutoff;
    GET DIAGNOSTICS v_auth = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_contact, v_event, v_auth;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_rate_limits(INTEGER)
  TO service_role;
