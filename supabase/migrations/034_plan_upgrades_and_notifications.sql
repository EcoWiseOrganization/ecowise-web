-- ================================================================
-- EcoWise: Manual plan-upgrade requests + in-app notifications
-- Migration: 034_plan_upgrades_and_notifications
--
--   Tables:
--     • PlanUpgradeRequests — a user/org admin requests a paid plan and
--       transfers money by bank QR; a System Admin reviews + approves,
--       which activates the subscription out-of-band (no card gateway).
--     • Notifications       — per-user in-app notifications surfaced via
--       the header bell. Render text is derived client-side from
--       `type` + `data` so the UI stays fully i18n-able.
--
--   Idempotent — safe to re-run.
-- ================================================================

-- ── ENUM ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE plan_upgrade_request_status AS ENUM (
    'Pending', 'Approved', 'Rejected', 'Canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PlanUpgradeRequests ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlanUpgradeRequests" (
  id                       UUID                        DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type             subscription_subject_type   NOT NULL,
  subject_id               UUID                        NOT NULL,
  -- The plan the requester wants to move onto.
  plan_id                  UUID                        NOT NULL REFERENCES "SubscriptionPlans"(id),
  -- Snapshot of the plan they were on when the request was filed (audit / UI).
  current_plan_id          UUID                        REFERENCES "SubscriptionPlans"(id),
  status                   plan_upgrade_request_status NOT NULL DEFAULT 'Pending',
  amount                   NUMERIC(12, 2)              NOT NULL DEFAULT 0,
  currency                 TEXT                        NOT NULL DEFAULT 'USD',
  -- Bank-transfer reference the requester should include so the admin can
  -- match the incoming payment to this request (defaults to their email).
  transfer_note            TEXT,
  requested_by             UUID                        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by              UUID                        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at              TIMESTAMPTZ,
  reject_reason            TEXT,
  -- Subscription row created when the request is approved.
  resulting_subscription_id UUID                       REFERENCES "Subscriptions"(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  CONSTRAINT plan_upgrade_requests_amount_nonneg CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_plan_upgrade_requests_status
  ON "PlanUpgradeRequests" (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_upgrade_requests_subject
  ON "PlanUpgradeRequests" (subject_type, subject_id);

-- At most one *Pending* request per subject so the admin queue never
-- shows duplicates and the requester can't spam the queue. A second
-- request upserts onto this row (see upgrade-request.service.ts).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname  = 'plan_upgrade_requests_one_pending_per_subject_uidx'
  ) THEN
    CREATE UNIQUE INDEX plan_upgrade_requests_one_pending_per_subject_uidx
      ON public."PlanUpgradeRequests" (subject_type, subject_id)
      WHERE status = 'Pending';
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_plan_upgrade_requests_updated_at ON "PlanUpgradeRequests";
CREATE TRIGGER trg_plan_upgrade_requests_updated_at
  BEFORE UPDATE ON "PlanUpgradeRequests"
  FOR EACH ROW EXECUTE FUNCTION ghg_update_updated_at();

ALTER TABLE "PlanUpgradeRequests" ENABLE ROW LEVEL SECURITY;

-- Read: System Admin (review queue) OR the subject themselves (status badge
-- on the billing page). Writes happen exclusively through the service role
-- (server actions) so there is no authenticated write policy.
DROP POLICY IF EXISTS "plan_upgrade_requests: admin or subject read" ON "PlanUpgradeRequests";
CREATE POLICY "plan_upgrade_requests: admin or subject read"
  ON "PlanUpgradeRequests" FOR SELECT
  TO authenticated
  USING (
    is_system_admin()
    OR (subject_type = 'User' AND subject_id = auth.uid())
    OR (subject_type = 'Org'  AND public.is_emission_org_admin(subject_id))
  );

DROP TRIGGER IF EXISTS trg_audit_plan_upgrade_requests ON "PlanUpgradeRequests";
CREATE TRIGGER trg_audit_plan_upgrade_requests
  AFTER INSERT OR UPDATE OR DELETE ON "PlanUpgradeRequests"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('plan_upgrade_request', 'subject_id');

-- ── Notifications ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notifications" (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Stable key the UI maps to an i18n string (e.g. 'plan_upgrade_approved').
  type        TEXT         NOT NULL,
  -- Interpolation params for the i18n string + any deep-link metadata.
  data        JSONB        NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON "Notifications" (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON "Notifications" (user_id) WHERE read_at IS NULL;

ALTER TABLE "Notifications" ENABLE ROW LEVEL SECURITY;

-- Each user reads + marks-read only their own notifications. Inserts come
-- from the service role (server-side notification.service).
DROP POLICY IF EXISTS "notifications: owner read" ON "Notifications";
CREATE POLICY "notifications: owner read"
  ON "Notifications" FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications: owner update" ON "Notifications";
CREATE POLICY "notifications: owner update"
  ON "Notifications" FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
