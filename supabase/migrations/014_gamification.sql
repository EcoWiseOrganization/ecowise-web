-- ================================================================
-- EcoWise: Gamification (Phase 9)
-- Migration: 014_gamification
--   • Challenges (UC-48, UC-49) — org-scoped optional (Phase 9.5 confirmation)
--   • UserChallenges (UC-50)
--   • Badges + UserBadges
--   • Rewards (UC-54) + Redemptions (UC-53) + GreenPointLogs (BR-12, BR-13)
--   • Atomic redeem helper RPC `redeem_reward(reward_id, user_id)` keeps stock
--     + points + history coherent in a single transaction.
-- Idempotent: safe to re-run.
-- ================================================================

-- ── ENUMS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM ('Draft', 'Upcoming', 'Active', 'Completed', 'Archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE challenge_verification AS ENUM ('Photo', 'Honor', 'Auto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_challenge_status AS ENUM ('Joined', 'InProgress', 'Completed', 'Failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reward_status AS ENUM ('Active', 'LowStock', 'Inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reward_fulfillment AS ENUM ('Digital', 'Physical', 'Donation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE redemption_status AS ENUM ('Pending', 'Fulfilled', 'Canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE green_point_action AS ENUM ('Earn', 'Spend', 'Adjust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Challenges ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Challenges" (
  id                  UUID                      DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id              UUID                      REFERENCES "Organization"(id) ON DELETE CASCADE,
  name                TEXT                      NOT NULL,
  category            TEXT                      NOT NULL,
  target_audience     TEXT                      NOT NULL DEFAULT 'all',
  description         TEXT,
  rules               JSONB                     NOT NULL DEFAULT '{}'::jsonb,
  points_reward       INTEGER                   NOT NULL DEFAULT 0 CHECK (points_reward >= 0),
  duration_days       INTEGER                   NOT NULL DEFAULT 7  CHECK (duration_days >= 1),
  verification_method challenge_verification    NOT NULL DEFAULT 'Honor',
  status              challenge_status          NOT NULL DEFAULT 'Draft',
  start_date          DATE                      NOT NULL DEFAULT (now()::date),
  end_date            DATE                      NOT NULL,
  created_at          TIMESTAMPTZ               NOT NULL DEFAULT now(),
  created_by          UUID                      REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at          TIMESTAMPTZ               NOT NULL DEFAULT now(),
  CONSTRAINT challenges_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_challenges_org      ON "Challenges" (org_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status   ON "Challenges" (status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates    ON "Challenges" (start_date, end_date);

DROP TRIGGER IF EXISTS trg_challenges_updated_at ON "Challenges";
CREATE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON "Challenges"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

ALTER TABLE "Challenges" ENABLE ROW LEVEL SECURITY;

-- Read: global challenges visible to everyone authenticated; org challenges
-- visible only to org members. (System Admin sees everything.)
DROP POLICY IF EXISTS "challenges: read" ON "Challenges";
CREATE POLICY "challenges: read"
  ON "Challenges" FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL
    OR public.is_emission_org_member(org_id)
    OR is_system_admin()
  );

-- Write: System Admin (global), Org Admin (their org).
DROP POLICY IF EXISTS "challenges: write" ON "Challenges";
CREATE POLICY "challenges: write"
  ON "Challenges" FOR ALL
  TO authenticated
  USING (
    is_system_admin()
    OR (org_id IS NOT NULL AND public.is_emission_org_admin(org_id))
  )
  WITH CHECK (
    is_system_admin()
    OR (org_id IS NOT NULL AND public.is_emission_org_admin(org_id))
  );

DROP TRIGGER IF EXISTS trg_audit_challenges ON "Challenges";
CREATE TRIGGER trg_audit_challenges
  AFTER INSERT OR UPDATE OR DELETE ON "Challenges"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('challenge');

-- ── UserChallenges ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserChallenges" (
  id            UUID                  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID                  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id  UUID                  NOT NULL REFERENCES "Challenges"(id) ON DELETE CASCADE,
  status        user_challenge_status NOT NULL DEFAULT 'Joined',
  progress      JSONB                 NOT NULL DEFAULT '{}'::jsonb,
  joined_at     TIMESTAMPTZ           NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON "UserChallenges" (user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_chal ON "UserChallenges" (challenge_id);

ALTER TABLE "UserChallenges" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_challenges: self" ON "UserChallenges";
CREATE POLICY "user_challenges: self"
  ON "UserChallenges" FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR is_system_admin())
  WITH CHECK (user_id = auth.uid());

-- ── Badges ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Badges" (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT         NOT NULL UNIQUE,
  name        TEXT         NOT NULL,
  description TEXT,
  icon_url    TEXT,
  criteria    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE "Badges" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges: read" ON "Badges";
CREATE POLICY "badges: read"
  ON "Badges" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "badges: write admin" ON "Badges";
CREATE POLICY "badges: write admin"
  ON "Badges" FOR ALL TO authenticated
  USING (is_system_admin()) WITH CHECK (is_system_admin());

CREATE TABLE IF NOT EXISTS "UserBadges" (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    UUID         NOT NULL REFERENCES "Badges"(id)    ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE "UserBadges" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_badges: self select" ON "UserBadges";
CREATE POLICY "user_badges: self select"
  ON "UserBadges" FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_system_admin());

-- ── Rewards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Rewards" (
  id            UUID                DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT                NOT NULL,
  category      TEXT,
  sku           TEXT                UNIQUE,
  description   TEXT,
  image_url     TEXT,
  points_cost   INTEGER             NOT NULL CHECK (points_cost > 0),
  total_stock   INTEGER             NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  fulfillment   reward_fulfillment  NOT NULL DEFAULT 'Digital',
  status        reward_status       NOT NULL DEFAULT 'Active',
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT now(),
  created_by    UUID                REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_status ON "Rewards" (status);
DROP TRIGGER IF EXISTS trg_rewards_updated_at ON "Rewards";
CREATE TRIGGER trg_rewards_updated_at
  BEFORE UPDATE ON "Rewards"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

ALTER TABLE "Rewards" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rewards: read" ON "Rewards";
CREATE POLICY "rewards: read"
  ON "Rewards" FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rewards: write admin" ON "Rewards";
CREATE POLICY "rewards: write admin"
  ON "Rewards" FOR ALL TO authenticated
  USING (is_system_admin()) WITH CHECK (is_system_admin());

DROP TRIGGER IF EXISTS trg_audit_rewards ON "Rewards";
CREATE TRIGGER trg_audit_rewards
  AFTER INSERT OR UPDATE OR DELETE ON "Rewards"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('reward');

-- ── Redemptions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Redemptions" (
  id              UUID                DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID                NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id       UUID                NOT NULL REFERENCES "Rewards"(id),
  points_spent    INTEGER             NOT NULL,
  status          redemption_status   NOT NULL DEFAULT 'Pending',
  fulfillment_data JSONB              DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user   ON "Redemptions" (user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward ON "Redemptions" (reward_id);

ALTER TABLE "Redemptions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "redemptions: self select" ON "Redemptions";
CREATE POLICY "redemptions: self select"
  ON "Redemptions" FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_system_admin());

-- ── GreenPointLogs (append-only) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GreenPointLogs" (
  id             UUID                  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID                  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         green_point_action    NOT NULL,
  points         INTEGER               NOT NULL,
  reason         TEXT,
  related_id     UUID,
  related_type   TEXT,
  created_at     TIMESTAMPTZ           NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_green_point_logs_user ON "GreenPointLogs" (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_green_point_logs_at   ON "GreenPointLogs" (created_at DESC);

ALTER TABLE "GreenPointLogs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "green_point_logs: self" ON "GreenPointLogs";
CREATE POLICY "green_point_logs: self"
  ON "GreenPointLogs" FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_system_admin());

-- Append-only: reject UPDATE/DELETE/TRUNCATE.
CREATE OR REPLACE FUNCTION public.prevent_green_point_log_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'GREEN_POINT_LOG_APPEND_ONLY: GreenPointLogs rows cannot be % (BR-12).', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_green_point_logs_immutable_update ON "GreenPointLogs";
CREATE TRIGGER trg_green_point_logs_immutable_update
  BEFORE UPDATE ON "GreenPointLogs"
  FOR EACH ROW EXECUTE FUNCTION public.prevent_green_point_log_modification();

DROP TRIGGER IF EXISTS trg_green_point_logs_immutable_delete ON "GreenPointLogs";
CREATE TRIGGER trg_green_point_logs_immutable_delete
  BEFORE DELETE ON "GreenPointLogs"
  FOR EACH ROW EXECUTE FUNCTION public.prevent_green_point_log_modification();

-- ── Atomic redeem RPC (BR-13) ─────────────────────────────────────────────
-- Decrements stock + deducts points + writes log row in one transaction.
-- Returns the redemption row id on success; raises explicit codes otherwise.
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
BEGIN
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

-- ── Atomic earn RPC (BR-12) ───────────────────────────────────────────────
-- Increments user's balance + appends an audit row.
CREATE OR REPLACE FUNCTION public.earn_green_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_related_id UUID,
  p_related_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'INVALID_POINTS';
  END IF;
  UPDATE "User" SET green_points = green_points + p_points WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  INSERT INTO "GreenPointLogs"(user_id, action, points, reason, related_id, related_type)
  VALUES (p_user_id, 'Earn', p_points, p_reason, p_related_id, p_related_type)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.earn_green_points(UUID, INTEGER, TEXT, UUID, TEXT) TO service_role;

-- ── Seed: 4 default badges + 3 sample rewards ─────────────────────────────
INSERT INTO "Badges" (code, name, description, criteria) VALUES
  ('FIRST_LOG',     'First Log',           'Recorded your first activity.',         '{"trigger":"first_emission_log"}'::jsonb),
  ('TEN_LOGS',      'Sustainability Starter', 'Logged 10 verified activities.',     '{"trigger":"verified_logs","threshold":10}'::jsonb),
  ('HUNDRED_KG',    'Carbon Cutter',       'Tracked 100 kg CO2e of emissions.',     '{"trigger":"co2e_tracked","threshold":100}'::jsonb),
  ('TARGET_HIT',    'Goal Achiever',       'Reached an emission reduction target.', '{"trigger":"target_completed"}'::jsonb)
ON CONFLICT (code) DO NOTHING;

INSERT INTO "Rewards" (name, category, sku, description, points_cost, total_stock, fulfillment, status) VALUES
  ('EcoWise Notebook',        'Merchandise', 'NB-001',   'Recycled-paper notebook with EcoWise branding.', 200, 50, 'Physical', 'Active'),
  ('Tree Planting Donation',  'Donation',    'TREE-1',   'We plant a tree on your behalf.',                500, 9999, 'Donation', 'Active'),
  ('Premium Discount Code',   'Digital',     'CODE-PRO', '10% off your next Pro plan renewal.',            150, 100, 'Digital', 'Active')
ON CONFLICT (sku) DO NOTHING;
