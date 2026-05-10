-- ================================================================
-- EcoWise: Personal carbon tracking (Phase 4)
-- Migration: 009_targets_and_personal
--   • Make EmissionLogs.org_id NULLABLE so individual users can log
--     personal emissions outside any organization (BR-05).
--   • Carbon reduction targets (UC-15) — per user OR per org.
--   • Daily log counters (BR-09 anti-spam for B2C).
-- Idempotent: safe to re-run.
-- ================================================================

-- ── 1) EmissionLogs: relax org_id to NULL for personal logs ───────────────
ALTER TABLE "EmissionLogs"
  ALTER COLUMN org_id DROP NOT NULL;

COMMENT ON COLUMN "EmissionLogs".org_id IS
  'Organization owning this log; NULL for personal (individual) logs (BR-05).';

-- Add policy that lets users SELECT/INSERT/UPDATE/DELETE their own personal
-- logs (org_id IS NULL AND created_by = auth.uid()). Existing org-scoped
-- policies remain in effect for org logs.
DROP POLICY IF EXISTS "emission_logs: personal owner select" ON "EmissionLogs";
CREATE POLICY "emission_logs: personal owner select"
  ON "EmissionLogs" FOR SELECT
  TO authenticated
  USING (org_id IS NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "emission_logs: personal owner insert" ON "EmissionLogs";
CREATE POLICY "emission_logs: personal owner insert"
  ON "EmissionLogs" FOR INSERT
  TO authenticated
  WITH CHECK (org_id IS NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "emission_logs: personal owner update" ON "EmissionLogs";
CREATE POLICY "emission_logs: personal owner update"
  ON "EmissionLogs" FOR UPDATE
  TO authenticated
  USING (org_id IS NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "emission_logs: personal owner delete" ON "EmissionLogs";
CREATE POLICY "emission_logs: personal owner delete"
  ON "EmissionLogs" FOR DELETE
  TO authenticated
  USING (org_id IS NULL AND created_by = auth.uid());

-- ── 2) Carbon reduction targets (UC-15) ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE carbon_target_status AS ENUM ('Active', 'Achieved', 'Failed', 'Archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CarbonTargets" (
  id              UUID                   DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID                   REFERENCES auth.users(id)        ON DELETE CASCADE,
  org_id          UUID                   REFERENCES "Organization"(id)    ON DELETE CASCADE,
  name            TEXT                   NOT NULL,
  baseline_co2e   NUMERIC(18, 4)         NOT NULL,
  target_co2e     NUMERIC(18, 4)         NOT NULL,
  start_date      DATE                   NOT NULL,
  end_date        DATE                   NOT NULL,
  status          carbon_target_status   NOT NULL DEFAULT 'Active',
  notes           TEXT,
  created_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),
  created_by      UUID                   REFERENCES auth.users(id)        ON DELETE SET NULL,
  -- Either user_id or org_id must be set.
  CONSTRAINT carbon_targets_subject_check
    CHECK ((user_id IS NOT NULL) OR (org_id IS NOT NULL)),
  CONSTRAINT carbon_targets_date_order  CHECK (end_date > start_date),
  CONSTRAINT carbon_targets_target_lt_baseline
    CHECK (target_co2e >= 0 AND baseline_co2e >= 0)
);

CREATE INDEX IF NOT EXISTS idx_carbon_targets_user   ON "CarbonTargets" (user_id);
CREATE INDEX IF NOT EXISTS idx_carbon_targets_org    ON "CarbonTargets" (org_id);
CREATE INDEX IF NOT EXISTS idx_carbon_targets_status ON "CarbonTargets" (status);

ALTER TABLE "CarbonTargets" ENABLE ROW LEVEL SECURITY;

-- Personal target — owner only
DROP POLICY IF EXISTS "carbon_targets: personal owner all" ON "CarbonTargets";
CREATE POLICY "carbon_targets: personal owner all"
  ON "CarbonTargets" FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Org target — Org Admin only (uses helper from migration 003)
DROP POLICY IF EXISTS "carbon_targets: org admin all" ON "CarbonTargets";
CREATE POLICY "carbon_targets: org admin all"
  ON "CarbonTargets" FOR ALL
  TO authenticated
  USING (org_id IS NOT NULL AND public.is_emission_org_admin(org_id))
  WITH CHECK (org_id IS NOT NULL AND public.is_emission_org_admin(org_id));

-- Org target — read by any active member
DROP POLICY IF EXISTS "carbon_targets: org member select" ON "CarbonTargets";
CREATE POLICY "carbon_targets: org member select"
  ON "CarbonTargets" FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL AND public.is_emission_org_member(org_id));

-- Audit trigger
DROP TRIGGER IF EXISTS trg_audit_carbon_targets ON "CarbonTargets";
CREATE TRIGGER trg_audit_carbon_targets
  AFTER INSERT OR UPDATE OR DELETE ON "CarbonTargets"
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change('carbon_target');

-- ── 3) Daily log counters (BR-09 anti-spam for B2C) ───────────────────────
CREATE TABLE IF NOT EXISTS "DailyLogCounters" (
  user_id   UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date  DATE         NOT NULL,
  count     INTEGER      NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_log_counters_date ON "DailyLogCounters" (log_date);

ALTER TABLE "DailyLogCounters" ENABLE ROW LEVEL SECURITY;
-- Service role only — no policies for authenticated users; the API increments
-- counters atomically via service client.

COMMENT ON TABLE "DailyLogCounters" IS
  'BR-09: per-user-per-day submission count for personal emission logs. Hard cap configured in app layer.';
