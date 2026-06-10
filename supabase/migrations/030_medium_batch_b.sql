-- ─────────────────────────────────────────────────────────────────────────
-- Migration 030 — medium-severity batch B follow-ups
--
-- Bundles three independent DB-side fixes from REVIEW.md batch M-B:
--
--   (1) `Rewards.status = 'SoldOut'` — original `reward_status` enum
--       conflated "out of stock" with "low stock". UI showed "LowStock"
--       for items at zero stock. Add a dedicated SoldOut value and
--       rewrite `redeem_reward` to:
--         • SoldOut  when post-decrement stock = 0
--         • LowStock when 0 < post-decrement stock < 5
--         • keep prior status otherwise
--       Backfill historical rows that were stuck on LowStock at stock=0.
--
--   (2) `adjust_green_points` RPC — admin claw-back support. The existing
--       `earn_green_points` rejects `points <= 0`, so a customer-support
--       agent cannot reverse a point credit when abuse is detected. The
--       new RPC accepts a signed delta and floors the resulting balance
--       at 0 atomically (FOR UPDATE on the User row).
--
--   (3) `consume_event_form_rate_limit` RPC — atomic rate-limit check +
--       insert for the public event form endpoint. Previously the route
--       counted recent rows, then inserted a row — a burst of N parallel
--       submits could all observe count<max and bypass the cap. The
--       RPC takes an advisory lock keyed on (token, ip) so submissions
--       for the same bucket serialise while different buckets stay
--       independent.
-- ─────────────────────────────────────────────────────────────────────────

-- (1) Rewards: SoldOut enum value + tighter redeem_reward.
DO $$
BEGIN
  ALTER TYPE reward_status ADD VALUE IF NOT EXISTS 'SoldOut';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END
$$;

UPDATE "Rewards"
   SET status = 'SoldOut'::reward_status
 WHERE status = 'LowStock'::reward_status
   AND total_stock <= 0;

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_reward_id UUID,
  p_user_id   UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward        "Rewards"%ROWTYPE;
  v_user_points   INTEGER;
  v_redemption_id UUID;
  v_new_stock     INTEGER;
  v_new_status    reward_status;
BEGIN
  -- Auth gate from migration 020: if a session JWT is present the
  -- subject must match p_user_id. service_role keeps full access for
  -- trusted server actions.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN_USER';
  END IF;

  SELECT * INTO v_reward FROM "Rewards" WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REWARD_NOT_FOUND'; END IF;

  IF v_reward.status NOT IN ('Active'::reward_status, 'LowStock'::reward_status) THEN
    RAISE EXCEPTION 'REWARD_INACTIVE';
  END IF;

  IF v_reward.total_stock <= 0 THEN
    RAISE EXCEPTION 'REWARD_OUT_OF_STOCK';
  END IF;

  SELECT green_points INTO v_user_points
    FROM "User" WHERE id = p_user_id FOR UPDATE;
  IF v_user_points IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF v_user_points < v_reward.points_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS';
  END IF;

  v_new_stock := v_reward.total_stock - 1;
  v_new_status := CASE
    WHEN v_new_stock <= 0 THEN 'SoldOut'::reward_status
    WHEN v_new_stock < 5  THEN 'LowStock'::reward_status
    ELSE v_reward.status
  END;

  UPDATE "Rewards"
     SET total_stock = v_new_stock,
         status      = v_new_status
   WHERE id = p_reward_id;

  UPDATE "User"
     SET green_points = green_points - v_reward.points_cost
   WHERE id = p_user_id;

  INSERT INTO "Redemptions"(user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'Pending')
  RETURNING id INTO v_redemption_id;

  INSERT INTO "GreenPointLogs"(user_id, action, points, reason, related_id, related_type)
  VALUES (
    p_user_id,
    'Spend',
    -v_reward.points_cost,
    'Redeemed reward: ' || v_reward.name,
    p_reward_id,
    'reward'
  );

  RETURN v_redemption_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID)
  TO authenticated, service_role;

-- (2) adjust_green_points — admin claw-back with floor at 0.
CREATE OR REPLACE FUNCTION public.adjust_green_points(
  p_user_id      UUID,
  p_delta        INTEGER,
  p_reason       TEXT,
  p_related_id   UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id  UUID;
  v_balance INTEGER;
  v_applied INTEGER;
BEGIN
  IF p_delta = 0 THEN RAISE EXCEPTION 'ZERO_DELTA'; END IF;

  SELECT green_points INTO v_balance
    FROM "User" WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  -- Floor at 0: an admin clawing back more than the user has only
  -- removes the available balance — never pushes the column negative.
  IF p_delta < 0 THEN
    v_applied := GREATEST(p_delta, -v_balance);
  ELSE
    v_applied := p_delta;
  END IF;

  IF v_applied = 0 THEN RAISE EXCEPTION 'BALANCE_ZERO'; END IF;

  UPDATE "User"
     SET green_points = green_points + v_applied
   WHERE id = p_user_id;

  INSERT INTO "GreenPointLogs"(user_id, action, points, reason, related_id, related_type)
  VALUES (
    p_user_id,
    CASE WHEN v_applied > 0 THEN 'Earn' ELSE 'Spend' END,
    v_applied,
    p_reason,
    p_related_id,
    p_related_type
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_green_points(UUID, INTEGER, TEXT, UUID, TEXT)
  TO service_role;

-- (3) consume_event_form_rate_limit — atomic check+insert.
CREATE OR REPLACE FUNCTION public.consume_event_form_rate_limit(
  p_token      TEXT,
  p_ip         TEXT,
  p_max        INTEGER,
  p_window_sec INTEGER
) RETURNS TABLE (allowed BOOLEAN, retry_after_sec INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock_key BIGINT;
  v_count    INTEGER;
  v_earliest TIMESTAMPTZ;
  v_cutoff   TIMESTAMPTZ;
BEGIN
  v_cutoff   := now() - make_interval(secs => p_window_sec);
  -- 64-bit advisory lock keyed on (token, ip) — same bucket serialises,
  -- other buckets stay parallel. Transaction-scoped: released on commit.
  v_lock_key := hashtextextended(p_token || '|' || p_ip, 42);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT COUNT(*), MIN(created_at)
    INTO v_count, v_earliest
    FROM "EventPublicFormRateLimits"
   WHERE token = p_token
     AND ip_address = p_ip
     AND created_at >= v_cutoff;

  IF v_count >= p_max THEN
    allowed := FALSE;
    retry_after_sec := GREATEST(
      1,
      CEIL(
        EXTRACT(EPOCH FROM (v_earliest + make_interval(secs => p_window_sec) - now()))
      )::INTEGER
    );
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO "EventPublicFormRateLimits"(token, ip_address)
  VALUES (p_token, p_ip);

  allowed := TRUE;
  retry_after_sec := 0;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_event_form_rate_limit(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;
