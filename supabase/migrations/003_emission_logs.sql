-- ================================================================
-- EcoWise: Activity Emission Logger
-- Migration: 003_emission_logs
-- Depends on: 002_emission_engine (ghg_scope enum, "EmissionCategories")
-- ================================================================

-- ── ENUM: emission_log_status ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE emission_log_status AS ENUM ('Pending', 'Review', 'Verified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── HELPER FUNCTIONS (PascalCase tables) ──────────────────────────────────
-- These target the actual production tables ("OrganizationMembers" with role_id).
-- ROLE_ADMIN_ID must match the value in src/lib/roles.ts.

CREATE OR REPLACE FUNCTION public.is_emission_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "OrganizationMembers"
    WHERE org_id  = p_org_id
      AND user_id = auth.uid()
      AND status  = 'Active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_emission_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "OrganizationMembers"
    WHERE org_id  = p_org_id
      AND user_id = auth.uid()
      AND role_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      AND status  = 'Active'
  );
$$;

-- ── TABLE: "EmissionLogs" ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EmissionLogs" (
  id              UUID                DEFAULT gen_random_uuid()  PRIMARY KEY,
  org_id          UUID                NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  activity_name   TEXT                NOT NULL,
  scope           ghg_scope           NOT NULL,
  source_type_id  UUID                REFERENCES "EmissionCategories"(id)   ON DELETE SET NULL,
  reporting_date  DATE                NOT NULL,
  quantity        NUMERIC(18, 4)      NOT NULL,
  unit            TEXT                NOT NULL,
  co2e_result     NUMERIC(18, 4),
  status          emission_log_status NOT NULL DEFAULT 'Pending',
  evidence_url    TEXT,
  created_by      UUID                REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ         DEFAULT now(),

  CONSTRAINT emission_logs_positive_quantity CHECK (quantity > 0)
);

-- ── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emission_logs_org_id         ON "EmissionLogs" (org_id);
CREATE INDEX IF NOT EXISTS idx_emission_logs_scope          ON "EmissionLogs" (scope);
CREATE INDEX IF NOT EXISTS idx_emission_logs_status         ON "EmissionLogs" (status);
CREATE INDEX IF NOT EXISTS idx_emission_logs_reporting_date ON "EmissionLogs" (reporting_date);
CREATE INDEX IF NOT EXISTS idx_emission_logs_created_at     ON "EmissionLogs" (created_at DESC);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
ALTER TABLE "EmissionLogs" ENABLE ROW LEVEL SECURITY;

-- Any active org member can read their org's logs
CREATE POLICY "emission_logs: org members can select"
  ON "EmissionLogs" FOR SELECT
  USING (public.is_emission_org_member(org_id));

-- Only org admins can insert (and must set themselves as created_by)
CREATE POLICY "emission_logs: org admins can insert"
  ON "EmissionLogs" FOR INSERT
  WITH CHECK (
    public.is_emission_org_admin(org_id)
    AND auth.uid() = created_by
  );

-- Only org admins can update
CREATE POLICY "emission_logs: org admins can update"
  ON "EmissionLogs" FOR UPDATE
  USING (public.is_emission_org_admin(org_id));

-- Only org admins can delete
CREATE POLICY "emission_logs: org admins can delete"
  ON "EmissionLogs" FOR DELETE
  USING (public.is_emission_org_admin(org_id));

-- ── STORAGE BUCKET ────────────────────────────────────────────────────────
-- Run once in Supabase Dashboard > Storage, or via the management API:
--
--   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   VALUES (
--     'emission-evidence',
--     'emission-evidence',
--     false,
--     10485760,  -- 10 MB
--     ARRAY['image/jpeg','image/png','image/webp','application/pdf',
--           'text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
--   )
--   ON CONFLICT DO NOTHING;
--
-- Storage RLS: allow org admins to upload/download their own org's evidence.
