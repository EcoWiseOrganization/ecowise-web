-- ================================================================
-- EcoWise: atomic daily-log counter for BR-09
-- Migration: 026_daily_counter_rpc
-- ================================================================
--
-- BEFORE: the app-side `incrementTodayLogCount` did a read-then-upsert
-- (count = current + 1). Two concurrent personal-log inserts both read
-- the same `current` and both wrote the same `next`, meaning the BR-09
-- 50/day quota could be exceeded under burst load. The BR-09 check
-- itself (`exceedsDailyLogLimit`) also ran in the app *before* the
-- increment, opening a classic TOCTOU window.
--
-- AFTER: a single SQL function that:
--   1. INSERTs a new row at count=1 or atomically increments via
--      ON CONFLICT DO UPDATE SET count = count + 1, taking the row
--      lock that serialises concurrent calls.
--   2. Refuses (without incrementing) when the resulting count would
--      exceed the BR-09 limit. Returns `allowed=false` so the caller
--      can surface MSG30 without writing the emission log.
--
-- Idempotent: safe to re-run (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.increment_daily_log_count(
  p_user_id  UUID,
  p_log_date DATE,
  p_limit    INTEGER DEFAULT 50
) RETURNS TABLE(new_count INTEGER, allowed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Service-role callers (auth.uid() IS NULL) skip the per-user check;
  -- signed-in callers can only ever increment their own row. Mirrors
  -- the redeem_reward auth guard added in migration 020.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Lock + read the existing row (if any) so the limit check is
  -- consistent with the increment we're about to do.
  SELECT count INTO v_count
    FROM "DailyLogCounters"
   WHERE user_id = p_user_id AND log_date = p_log_date
   FOR UPDATE;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  IF v_count >= p_limit THEN
    RETURN QUERY SELECT v_count, FALSE;
    RETURN;
  END IF;

  INSERT INTO "DailyLogCounters" (user_id, log_date, count)
  VALUES (p_user_id, p_log_date, 1)
  ON CONFLICT (user_id, log_date)
    DO UPDATE SET count = "DailyLogCounters".count + 1
  RETURNING count INTO v_count;

  RETURN QUERY SELECT v_count, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_daily_log_count(UUID, DATE, INTEGER)
  TO authenticated;
