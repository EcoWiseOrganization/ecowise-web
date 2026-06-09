-- ================================================================
-- EcoWise: harden `redeem_reward` RPC
-- Migration: 020_redeem_reward_auth_check
-- ================================================================
--
-- BEFORE: `redeem_reward(p_reward_id, p_user_id)` was granted to the
-- `authenticated` role and trusted whichever `p_user_id` the caller
-- passed. Because the function is `SECURITY DEFINER` it bypasses RLS,
-- so any signed-in user could call:
--
--   select public.redeem_reward('<reward>', '<some-other-user-id>');
--
-- to drain another user's green points (and queue redemptions in their
-- name) without their consent.
--
-- AFTER: the function rejects unless `auth.uid()` matches the
-- requested redeemer. The check runs *before* any UPDATE so a failed
-- call has zero side effects.
--
-- Idempotent: safe to re-run; uses CREATE OR REPLACE on the same
-- signature so previous GRANT remains valid.

CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward "Rewards"%ROWTYPE;
  v_user_points INTEGER;
  v_redemption_id UUID;
  v_caller UUID;
BEGIN
  -- Reject if the caller is trying to redeem on behalf of someone else.
  -- service_role callers (cron / admin tools) have auth.uid() = NULL and
  -- must specify p_user_id explicitly — we only allow that path when the
  -- function is invoked from a server-side context with no JWT (legitimate
  -- admin operations). If the caller has a JWT, they must redeem only for
  -- themselves.
  v_caller := auth.uid();
  IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Lock the reward row
  SELECT * INTO v_reward FROM "Rewards" WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REWARD_NOT_FOUND';
  END IF;
  IF v_reward.status <> 'Active' THEN
    RAISE EXCEPTION 'REWARD_INACTIVE';
  END IF;
  IF v_reward.total_stock <= 0 THEN
    RAISE EXCEPTION 'REWARD_OUT_OF_STOCK';
  END IF;

  -- Check user balance
  SELECT green_points INTO v_user_points FROM "User" WHERE id = p_user_id FOR UPDATE;
  IF v_user_points IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  IF v_user_points < v_reward.points_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_POINTS';
  END IF;

  -- Mutate: stock - 1, points - cost
  UPDATE "Rewards" SET total_stock = total_stock - 1,
    status = CASE
      WHEN total_stock - 1 = 0 THEN 'LowStock'
      ELSE status
    END
  WHERE id = p_reward_id;

  UPDATE "User" SET green_points = green_points - v_reward.points_cost WHERE id = p_user_id;

  -- Write redemption + green point log
  INSERT INTO "Redemptions"(user_id, reward_id, points_spent, status)
  VALUES (p_user_id, p_reward_id, v_reward.points_cost, 'Pending')
  RETURNING id INTO v_redemption_id;

  INSERT INTO "GreenPointLogs"(user_id, action, points, reason, related_id, related_type)
  VALUES (p_user_id, 'Spend', -v_reward.points_cost,
          'Reward redemption: ' || v_reward.name,
          v_redemption_id, 'redemption');

  RETURN v_redemption_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID, UUID) TO authenticated;
